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

    // Method needed for the data
    // The data are send, throw the tablegrades, to the new pages for grading
    function fetchAssignment(refresh) {
        return $mmaGrades.getAssignment(courseid, refresh).then(function(assign) {
            $scope.assign = assign;
            angular.forEach(assign, function(a) {
              return $mmaModAssign.getSubmissions(a.id, refresh).then(function(data) {
                  return $mmaModAssign.getSubmissionsUserData(data.submissions, courseid).then(function(submissions) {
                    a.submissions = submissions;
                    angular.forEach(submissions, function(submission, key) {
                        submission.text = $mmaModAssign.getSubmissionText(submission);
                        submission.attachments = $mmaModAssign.getSubmissionAttachments(submission);
                        if(a.submissions[key].userid == userid) {
                          a.key = key;
                          $scope.submission = a;
                        }
                    });
                  });
              });
            });
        });
     }

    fetchAssignment().finally(function() {
        $scope.assignmentLoaded = true;
    });

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

    $scope.refreshGrades = function() {
        fetchGrades(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };
});
