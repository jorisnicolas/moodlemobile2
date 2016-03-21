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

.controller('mmaAssignSubmissionList', function($scope, $mmSite, $mmFS, $mmFilepool, mmaGradingInfo, $stateParams, $ionicPlatform, $mmApp, $mmaModAssign) {
    $scope.courseid = $stateParams.courseid;
    $scope.assignid = $stateParams.assignid;
    $scope.submissions = [];
    $scope.isTablet = $ionicPlatform.isTablet();

    console.log($mmSite);
    console.log($stateParams.submissions);
    console.log($mmFS);
    console.log($mmFilepool);

    var submissions = $stateParams.submissions,
        assignid    = $stateParams.assignid;
    var attachmentLength = 0;
    var sortSub = [];
    fetchSubmissions();


    function fetchSubmissions() {
      sortSub = [];
      //Disable the icon downloadAll if everything is downloaded
      $mmSite.getDb().getAll('filepool').then(function(data){
          if(data.length === attachmentLength || attachmentLength === 0){
              $scope.dlDisable = true;
          }else{
              $scope.dlDisable = false;
          }
      });
      attachmentLength = 0;
      //Disable the synchronisation icon if nothing has to be synchronise
      $mmApp.getDB().getAll('grading_info').then(function(data){
          $scope.syncDisable = data.length;
      });


      if(submissions !== null) {
        submissions.forEach(function(submission) {
           attachmentLength += submission.attachments.length;
           // Check if the submission is already graded
          $mmApp.getDB().getAll(mmaGradingInfo).then(function(grade) {
              submission.graded = false;
              grade.forEach(function(data) {
                 if(data.userid === submission.userid && assignid === data.assignid) {
                   submission.graded = true;
                 }
              });
          });
          //Sort by attachments
          if(submission.attachments.length > 0) {
            sortSub.unshift(submission);
          }else {
            sortSub.push(submission);
          }
        });
        $scope.submissions = sortSub;
      }else {
        $scope.noSubmission = true;
      }
      $scope.submissionsLoaded = true;
    }

    $scope.refreshSubmissions = function() {
        // Missing finally to check if the function is done
        fetchSubmissions();
        $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.addGrade = function() {
      var grades = [];
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
                    files_filemanager: data.files_filemanager
                  }
              };
              data.file.forEach(function(file) {
                  $mmaModAssign.uploadFiles(file, data.files_filemanager, data.id);
              });
          });
          $mmaModAssign.addGrade(assignid, grades);
      });
    };

    $scope.downloadAll = function() {
      var file;
      sortSub.forEach(function(sub) {
        file = $mmaModAssign.getLocalSubmissionFile(sub);
        file.forEach(function(attachment, key) {
          uKey = sub.id + "" + key;
          $mmFilepool.addToQueueByUrl($mmSite.getId(), attachment.fileurl, {}, uKey , 0);
        });
      });
    };

});
