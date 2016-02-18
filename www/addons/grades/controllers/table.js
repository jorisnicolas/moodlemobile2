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
 * Controller to handle course grades.
 *
 * @module mm.addons.grades
 * @ngdoc controller
 * @name mmaGradesTableCtrl
 */
.controller('mmaGradesTableCtrl', function($scope, $stateParams, $mmUtil, $mmaGrades, $mmSite, $mmaModAssign) {

    var courseid = $stateParams.courseid,
          userid = $stateParams.userid;
    $scope.courseid = courseid;
    $scope.userid = userid;

    function fetchGrades(refresh) {
        return $mmaGrades.getGradesTable(courseid, userid, refresh).then(function(table) {
            $scope.gradesTable = table;
        }, function(message) {
            $mmUtil.showErrorModal(message);
            $scope.errormessage = message;
        });
    }

    function fetchAssignment(refresh) {
        // Get assignment data.
        return $mmaGrades.getAssignment(courseid, refresh).then(function(assign) {
            $scope.title = assign.name || $scope.title;
            $scope.description = assign.intro || $scope.description;
            $scope.assign = assign;
            angular.forEach(assign, function(a) {
              return $mmaModAssign.getSubmissions(a.id, refresh).then(function(data) {
                  a.submission = data;
                  angular.forEach(a.submission.submissions, function(submission, key) {
                      submission.text = $mmaModAssign.getSubmissionText(submission);
                      submission.attachments = $mmaModAssign.getSubmissionAttachments(submission);
                      if(a.submission.submissions[key].userid == userid) {
                        $scope.submission = a;
                        $scope.key = key;
                      }
                  });
              });
            });
        });
    }


    // function capabilities() {
    //   return $mmaGrades.hasCapabilities(courseid).then(function(res) {
    //     $scope.capabilities = true;//res;
    //   }, function(message) {
    //     $mmUtil.showErrorModal(message);
    //     $scope.errormessage = message;
    //   });
    // }




    fetchAssignment().finally(function() {
        $scope.assignmentLoaded = true;
    });

    $scope.refreshAssignment = function() {
        fetchAssignment(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    fetchGrades().then(function() {
        // Add log in Moodle.
        $mmSite.write('gradereport_user_view_grade_report', {
            courseid: courseid,
            userid: userid
        });
    })
    .finally(function() {
        $scope.gradesLoaded = true;
    });

    /*capabilities().then(function() {
      $mmSite.write('core_enrol_get_enrolled_users_with_capability',{
        courseid: courseid
      });
    });*/

    $scope.refreshGrades = function() {
        fetchGrades(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
