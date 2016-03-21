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
.controller('mmaAssignGradingCtrl', function($scope, $state, $stateParams, $mmaModAssign, $ionicPopup, $mmApp) {

    var userid = $stateParams.userid;
    var assignid = $stateParams.assignid;
    var courseid = $stateParams.courseid;
    var submission;
    $stateParams.submissions.forEach(function(sub) {
      if(userid === sub.userid) {
        submission = sub;
      }
    });
    $scope.title = submission.userfullname;
    $scope.submission = submission;
    $scope.component = $mmaModAssign;
    $scope.isPluginAvailable = isSubmissionPluginAvailable();
    $scope.send = false;

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
      var itemid = -1;
      var id = courseid + "" + userid + "" + assignid + "" + submission.id;
      var gradingInfo = $mmApp.getDB().get('grading_info', id);
      var file = $mmaModAssign.getLocalSubmissionFile(submission);
      gradingInfo.then(function(data) {
        console.log(data);
        if(data.itemid <= 0) {
          itemid = data.itemid;
        }
      });
      $mmaModAssign.saveGrade(id, assignid, userid, note, comment, itemid, file);
      $state.go('site.mod_assign-submissionsList', {assignid: assignid, courseid: courseid, submissions: $stateParams.submissions});
      console.log($mmApp.getDB().getAll('grading_info'));
    };

    $scope.showAlert = function(translate) {
      var alertPopup = $ionicPopup.alert({
        title: 'Grade',
        template: translate
      });
      alertPopup.then(function() {
        console.log('Success grading');
      });
    };
});
