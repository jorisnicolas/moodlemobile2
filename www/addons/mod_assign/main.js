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

angular.module('mm.addons.mod_assign', ['mm.core'])

.constant('mmaModAssignComponent', 'mmaModAssign')
.constant('mmaModAssignSubmissionComponent', 'mmaModAssignSubmission')
.constant('mmaGradingInfo', 'grading_info')

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_assign', {
        url: '/mod_assign',
        params: {
            module: null,
            courseid: null
        },
        views: {
            'site': {
                controller: 'mmaModAssignIndexCtrl',
                templateUrl: 'addons/mod_assign/templates/index.html'
            }
        }
    })
    .state('site.mod_assign-submission', {
        url: '/mod_assign-submission',
        params: {
            submission: null
        },
        views: {
            'site': {
                controller: 'mmaModAssignSubmissionCtrl',
                templateUrl: 'addons/mod_assign/templates/submission.html'
            }
        }
     })
    .state('site.mod_assign-submissionsList', {
        url: '/mod_assign-submissionsList',
        views: {
            'site': {
                templateUrl: 'addons/mod_assign/templates/submissionsList.html',
                controller: 'mmaAssignSubmissionList'
            }
        },
        params: {
            assignid: null,
            courseid: null,
            submissions: null
        }
    })
    .state('site.mod_assign-grading', {
        url: '/mod_assign-grading',
        views: {
            'site': {
                templateUrl: 'addons/mod_assign/templates/gradeSubmission.html',
                controller: 'mmaAssignGradingCtrl'
            }
        },
        params: {
          assignid: null,
          courseid: null,
          submissions: null,
          userid: null
        }
    })
    ;

})

.config(function($mmCourseDelegateProvider, $mmContentLinksDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModAssign', 'assign', '$mmaModAssignHandlers.courseContent');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModAssign', '$mmaModAssignHandlers.linksHandler');
});
