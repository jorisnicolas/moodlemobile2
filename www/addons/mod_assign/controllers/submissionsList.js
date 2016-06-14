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

.controller('mmaAssignSubmissionList', function($scope, $mmSite, $mmUtil, $mmFilepool, mmaGradingInfo, $stateParams, $ionicPlatform, $mmApp, $mmaModAssign) {
    $scope.courseid = $stateParams.courseid;
    $scope.assignid = $stateParams.assignid;
    $scope.submissions = [];
    $scope.isTablet = $ionicPlatform.isTablet();

    var submissions = $stateParams.submissions,
        assignid    = $stateParams.assignid;
    var attachmentLength = 0;
    var sortSub = [];
    fetchSubmissions(false);

    function fetchSubmissions(refresh) {
      sortSub = [];
      attachmentLength = 0;
      //Disable the synchronisation icon if nothing has to be synchronise
      $mmApp.getDB().getAll(mmaGradingInfo).then(function(data){
        $scope.syncDisable = true;
        if(data.length === 0) {
          $scope.syncDisable = true;
        }
        data.forEach(function(result) {
          if (result.submit === false) {
            $scope.syncDisable = false;
          }
        });
      });


      if(submissions !== null) {
        submissions.forEach(function(submission) {
           attachmentLength += submission.attachments.length;
           if(refresh === false) {
             submission.attachments.forEach(function(attachment, key) {
               uKey = submission.id + "" + key;
               $mmFilepool.addToQueueByUrl($mmSite.getId(), attachment.fileurl, {}, uKey , 0);
             });
           }
           $mmApp.getDB().getAll(mmaGradingInfo).then(function(grade) {
               // Check if the submission is already graded
               submission.graded = false;
               grade.forEach(function(data) {
                  if(data.userid === submission.userid && assignid === data.assignid) {
                    submission.graded = true;
                    submission.gradeData = {grade : data.grade, comment : data.comment};
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
        //TODO :: Add finally to check if the function is done
        fetchSubmissions(true);
        $scope.$broadcast('scroll.refreshComplete');
    };

    function downloadAll(sub) {
        sub.attachments.forEach(function(attachment, key) {
          uKey = sub.id + "" + key;
          $mmFilepool.addToQueueByUrl($mmSite.getId(), attachment.fileurl, {}, uKey , 0);
        });
    }

    $scope.sync = function() {
      var count = 0;
      $mmApp.getDB().getAll(mmaGradingInfo).then(function(grade) {
          grade.forEach(function(data) {
            if(data.submit === false && data.assignid === assignid) {
              data.file.forEach(function(file) {
                  $mmaModAssign.uploadFeedback(file, data.id, assignid, function() {
                    count++;
                    if(count === data.file.length) {
                      // check only the last one for success :/
                      $mmUtil.showModal('mma.mod_assign.gradesynctitle', 'mma.mod_assign.gradesync');
                      // $mmUtil.showErrorModal("Upload failed, check your connection");
                    }
                  });
              });
            }
          });
      });
    };
});
