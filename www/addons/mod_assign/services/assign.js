// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

angular.module('mm.addons.mod_assign')

/**
 * Assignments service.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name $mmaModAssign
 */

 .config(function($mmAppProvider, mmaGradingInfo) {
     var stores = [
         {
             name: mmaGradingInfo,
             keyPath: 'id',
             indexes: [
                 {
                     name: 'id',
                 },
                 {
                     name: 'assignid',
                 },
                 {
                     name: 'userid',
                 },
                 {
                     name: 'grade',
                 },
                 {
                     name: 'comment',
                 },
                 {
                     name: 'files_filemanager',
                 },
                 {
                     name: 'file',
                 }
             ]
         }
     ];
     $mmAppProvider.registerStores(stores);
 })

.factory('$mmaModAssign', function($mmSite, $q, $mmFS, $mmUser, $mmSitesManager, mmaGradingInfo, $mmFilepool, $mmApp) {
    var self = {};

    /**
     * Get an assignment.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getAssignment
     * @param {Number} courseid   Course ID the assignment belongs to.
     * @param {Number} cmid       Assignment module ID.
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @return {Promise}          Promise resolved with the assignment.
     */
    self.getAssignment = function(courseid, cmid, refresh) {
        var params = {
                "courseids": [courseid]
            },
            preSets = {};

        if (refresh) {
            preSets.getFromCache = false;
        }

        return $mmSite.read('mod_assign_get_assignments', params, preSets).then(function(response) {
            if (response.courses && response.courses.length) {
                var assignments = response.courses[0].assignments;
                for (var i = 0; i < assignments.length; i++) {
                    if (assignments[i].cmid == cmid) {
                        return assignments[i];
                    }
                }
                return $q.reject();
            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Get attachments of a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionAttachments
     * @param {Object} submission Submission.
     * @return {Object[]}         Submission attachments.
     */
    self.getSubmissionAttachments = function(submission) {
        var files = [];
        if (submission.plugins) {
            submission.plugins.forEach(function(plugin) {
                if (plugin.type === 'file' && plugin.fileareas && plugin.fileareas[0] && plugin.fileareas[0].files) {
                    files = plugin.fileareas[0].files;
                    angular.forEach(files, function(file) {
                        file.filename = file.filepath;
                    });
                }
            });
        }
        return files;
    };

    /**
     * Get text of a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionText
     * @param {Object} submission Submission.
     * @return {String}           Submission text.
     */
    self.getSubmissionText = function(submission) {
        var text = '';
        if (submission.plugins) {
            angular.forEach(submission.plugins, function(plugin) {
                if (plugin.type === 'onlinetext' && plugin.editorfields) {
                    text = plugin.editorfields[0].text;

                    // Online text contains '@@PLUGINFILE@@' for each embedded file. Replace those with the right URL.
                    if (plugin.fileareas && plugin.fileareas[0] && plugin.fileareas[0].files && plugin.fileareas[0].files[0]) {
                        var fileURL =  plugin.fileareas[0].files[0].fileurl;
                        fileURL = fileURL.substr(0, fileURL.lastIndexOf('/')).replace('pluginfile.php/', 'pluginfile.php?file=/');
                        text = text.replace(/@@PLUGINFILE@@/g, fileURL);
                    }
                }
            });
        }
        return text;
    };

    /**
     * Get an assignment submissions.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissions
     * @param {Number}  id        Assignment id.
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @return {Promise}          Promise resolved with:
     *                                    - canviewsubmissions: True if user can view submissions, false otherwise.
     *                                    - submissions: Array of submissions.
     */
    self.getSubmissions = function(id, refresh) {
        var params = {
                "assignmentids": [id]
            },
            preSets = {};

        if (refresh) {
            preSets.getFromCache = false;
        }

        return $mmSite.read('mod_assign_get_submissions', params, preSets).then(function(response) {
            // Check if we can view submissions, with enough permissions.
            if (response.warnings.length > 0 && response.warnings[0].warningcode == 1) {
                return {canviewsubmissions: false};
            } else {
                if (response.assignments && response.assignments.length) {
                    return {
                        canviewsubmissions: true,
                        submissions: response.assignments[0].submissions
                    };
                } else {
                    return $q.reject();
                }
            }
        });
    };

    /**
     * Get user data for submissions since they only have userid.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#getSubmissionsUserData
     * @param {Object[]} submissions Submissions to get the data for.
     * @param {Number}   courseid    ID of the course the submissions belong to.
     * @return {Promise}             Promise always resolved. Resolve param is the formatted submissions.
     */
    self.getSubmissionsUserData = function(submissions, courseid) {
        var promises = [];

        angular.forEach(submissions, function(submission) {
            var promise = $mmUser.getProfile(submission.userid, courseid, true).then(function(user) {
                submission.userfullname = user.fullname;
                submission.userprofileimageurl = user.profileimageurl;
            }, function() {
                // Error getting profile, resolve promise without adding any extra data.
            });
            promises.push(promise);
        });
        return $q.all(promises).then(function() {
            return submissions;
        });
    };

    /**
     * Add the grades from the mmApp bd.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#addGrade
     * @param {String} assign       The assignment id.
     * @param {Array} grades        The grades data
     * @param {Array} Ids           The Unique id for each grade
     * @return {Promise}
     */
    self.addGrade = function(assign, grades) {
      var data = {
        assignmentid: assign,
        applytoall: 0,
        grades: grades
      };
      console.log(data);
      // A METTRE DANS LE "then" lorsque le service marchera
      $mmApp.getDB().removeAll(mmaGradingInfo);
      return $mmSite.write('mod_assign_save_grades', data).then(function() {
          console.log("deleting database");
      });
    };


    /**
     * Add a grade to the mmApp bd (grading_info)
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#saveGrade
     * @param {String} uniqueId           The unique id of a grade
     * @param {Number} assignid            The assignement id
     * @param {Number} userid              The user id
     * @param {Number} grade               The new grade value
     * @param {String} comment             The new comment value
     * @param {Number} files_filemanager   The files_manager id
     * @param {Object[]} file                The object file
     * @return {Promise}
     */
    self.saveGrade = function(uniqueId, assignid, userid, grade, comment, files_filemanager, file) {
      return $mmApp.getDB().insert(mmaGradingInfo, {
                                                    id: uniqueId,
                                                    assignid: assignid,
                                                    userid: userid,
                                                    grade: grade,
                                                    comment: comment,
                                                    files_filemanager: files_filemanager,
                                                    file : file
                                                   }
                                  );
    };


    /**
     * Get the local path of a file
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getLocalSubmissionFile
     * @param {Object} submission       The file's submission
     * @return {Promise}                localfiles
     */
    self.getLocalSubmissionFile = function(submission) {
      var files = [];
      var localFiles = [];
      if (submission.plugins) {
        submission.plugins.forEach(function(plugin) {
          if (plugin.type == 'file' && plugin.fileareas[0].files) {
            files = plugin.fileareas[0].files;
          }
        });
      }
      if (files.length > 0) {
        files.forEach(function(file) {
          var uniqueId = $mmFilepool._getFileIdByUrl(file.fileurl);

          var path = $mmFilepool._getFilePath($mmSite.getId(), uniqueId);
          var fileWithLocalPath;
          if (path) {
            fileWithLocalPath = file;
            fileWithLocalPath.localpath = path;
            localFiles.push(fileWithLocalPath);
           }
        });
      }
      return localFiles;
    };

    /**
     * Upload the local files too moodle
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#uploadFiles
     * @param {Object} file       The file to upload
     * @param {Int} id            The itemID
     * @return {Promise}
     */
    self.uploadFiles = function(fileInfo, id) {
      var content;
      $mmSite.getDb().getAll('filepool').then(function(filepool) {
          filepool.forEach(function(file) {
            if(file.path === fileInfo.localpath) {
              $mmFS.readFile(file.path, 1).then(function(encodedfile) {
                content = encodedfile.split("base64,")[1];
                var data = {
                  component: "user",
                  filearea: "draft",
                  itemid: id,
                  filepath: file.path,
                  filename: fileInfo.filename,
                  filecontent: content,
                  contextlevel: "user",
                  instanceid : $mmSite.getUserId()
                };
                console.log(data);
                return $mmSite.write('core_files_upload', data).then(function(callback) {
                  console.log(callback);
                });
              });
            }
          });
      });
    };

    /**
     * Check if assignments plugin is enabled in a certain site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssign#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.wsAvailable('mod_assign_get_assignments') && site.wsAvailable('mod_assign_get_submissions');
        });
    };

    return self;
});
