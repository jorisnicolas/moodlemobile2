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
.controller('mmaGradesListCtrl', function($scope, $stateParams, $mmUtil, $mmaGrades, $mmSite) {

    var course = $stateParams.course,
        courseid = course.id;
        $scope.courseid = courseid;

    function fetchParticipants(refresh) {
        return $mmaGrades.getParticipants(courseid, refresh).then(function(data) {
            var students = [];
            data.forEach(function(participants) {
              if(participants.roles[0].roleid === 5) {
                students[students.length] = participants;
              }
            });
            $scope.participants = students;
            $scope.canLoadMore = true;
        }, function(message) {
            $mmUtil.showErrorModal(message);
            $scope.canLoadMore = false;
        });
    }

    function capabilities() {
      return $mmaGrades.hasCapabilities(courseid).then(function(res) {
        $scope.capabilities = res;
      }, function(message) {
        $mmUtil.showErrorModal(message);
        $scope.errormessage = message;
      });
    }


    // Get first participants.
    fetchParticipants().then(function() {
        // Add log in Moodle.
        $mmSite.write('core_user_view_user_list', {
            courseid: courseid
        });
    }).finally(function() {
        $scope.participantsLoaded = true;
    });

    capabilities().then(function() {
      $mmSite.write('core_enrol_get_enrolled_users_with_capability',{
        courseid: courseid
      });
    });

    $scope.refreshParticipants = function() {
        fetchParticipants(true).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.loadMoreParticipants = function(){
        fetchParticipants().finally(function() {
            $scope.$broadcast('scroll.infiniteScrollComplete');
        });
    };
});
