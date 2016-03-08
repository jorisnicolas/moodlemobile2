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
 * Assign submission controller.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignSubmissionCtrl
 */

.controller('mmaAssignSubmissionList', function($scope, $mmSite, $mmFilepool, mmaGradingInfo, $stateParams, $ionicPlatform, $mmApp, $mmaModAssign) {
    $scope.courseid = $stateParams.courseid;
    $scope.assignid = $stateParams.assignid;
    $scope.isTablet = $ionicPlatform.isTablet();
    $scope.submissions = $stateParams.submissions;
    console.log($mmSite.getDb().getAll('filepool'));
    console.log($mmApp.getDB().getAll('grading_info'));
    var sortSub = [];
    if($stateParams.submissions !== null) {
      $stateParams.submissions.forEach(function(submission) {
        $mmApp.getDB().getAll(mmaGradingInfo).then(function(grade) {
            submission.graded = false;
            grade.forEach(function(data) {
               if(data.userid === submission.userid && $stateParams.assignid === data.assignid) {
                 submission.graded = true;
               }
            });
        });
        if(submission.attachments.length > 0) {
          sortSub.unshift(submission);
        }else {
          sortSub.push(submission);
        }
      });
      console.log(sortSub);
      $scope.submissions = sortSub;
    }else {
      $scope.noSubmission = true;
    }
    $scope.submissionsLoaded = true;

    $scope.addGrade = function() {
      var grades = [];
      var assignid;
      return $mmApp.getDB().getAll(mmaGradingInfo).then(function(grade) {
          grade.forEach(function(data) {
              grades[grades.length] = {
                  userid: data.userid,
                  grade: data.grade,
                  attemptnumber: -1,
                  addattempt: 0,
                  workflowstate: "",
                  plugindata: {
                    assignfeedbackcomments_editor: {
                      text:  data.comment,
                      format: 4
                    },
                    files_filemanager: data.files_filemanager // itemId
                  }
              };
              assignid = data.assignid;
              // data.file.forEach(function(file) {
              //   //console.log($mmFS.readFile(file.localpath));
              //   //console.log($mmFS.readFileData($mmFS.readFile(file.localpath)));
              //   $mmaModAssign.uploadFiles(file, data.files_filemanager);
              // });
          });
          $mmaModAssign.addGrade(assignid, grades);
      });
    };

    $scope.downloadAll = function() {
      var file;
      sortSub.forEach(function(sub) {
        file = $mmaModAssign.getLocalSubmissionFile(sub);
        file.forEach(function(attachment) {
          $mmFilepool.addToQueueByUrl($mmSite.getId(), attachment.fileurl, {}, sub.id , 0);
          $mmWS.downloadFile(attachment.fileurl, attachment.localpath, attachment.filename);
        });
      });
    };

});
