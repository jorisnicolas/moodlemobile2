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

angular.module('mm.addons.grades')

/**
 * Assign submission controller.
 *
 * @module mm.addons.mod_assign
 * @ngdoc controller
 * @name mmaModAssignSubmissionCtrl
 */
.controller('mmaGradesSubmissionCtrl', function($scope, $mmFilepool, $mmFS, mmaGradingInfo, $stateParams, $mmaGrades, $ionicPopup, $mmSite, $mmApp) {

    var submission = $stateParams.submission || {};
    var userid = $stateParams.userid;
    var assign = $stateParams.assign;
    var courseid = $stateParams.courseid;
    $scope.title = submission.userfullname;
    $scope.submission = submission;
    $scope.component = $mmaGrades;
    $scope.isPluginAvailable = isSubmissionPluginAvailable();
    $scope.send = false;

    // console.log($mmFS.getFile(file)); //get the file
    // console.log(file);
    // console.log($mmApp.getDB().getAll(mmaGradingInfo));
    // console.log($mmFilepool);
    // console.log($mmFilepool._getFilePath($mmSite.getId(), $mmFilepool._getFileIdByUrl(submission.attachments[0].fileurl)));
    // console.log($mmFilepool._getFileIdByUrl(submission.attachments[0].fileurl));
    


    function isSubmissionPluginAvailable() {
      var available = false;
      angular.forEach(submission.plugins, function(plugin) {
        if(plugin.type == "comments") {
          available = true;
        }
      });
      return available;
    }

    $scope.saveGrade = function(note, comment) {
      $scope.send = true;
      var file = $mmaGrades.getLocalSubmissionFile(submission);
      $mmaGrades.saveGrade(courseid + "_" + userid + "_" + submission.id, userid, note, comment, submission.id, file);
      console.log($mmApp.getDB().getAll('grading_info'));
    };

    $scope.addGrade = function() {
      var grades = [];
      var Ids = [];
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
              Ids[Ids.length] = {
                uniqueid: data.uniqueId
              };

              data.file.forEach(function(attach) {
                $mmaGrades.uploadFiles(attach, submission.id);
              });
          });
          $mmaGrades.addGrade(assign, grades, Ids);
      });
    };

    $scope.showAlert = function() {
      var alertPopup = $ionicPopup.alert({
        title: 'Grade',
        template: 'Submission as been graded'
      });
      alertPopup.then(function() {
        console.log('Success grading');
      });
    };
});
