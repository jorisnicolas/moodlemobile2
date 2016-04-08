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

angular.module('mm.core')

/**
 * Directive to handle a file (my files, attachments, etc.). The file is not downloaded automatically.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmFile
 * @description
 * Directive to handle files (my files, attachments, etc.). Shows the file name, icon (depending on mimetype) and a button
 * to download/refresh it.
 *
 * Attributes:
 * @param {Object} file            Required. Object with the following attributes:
 *                                     'filename': Name of the file.
 *                                     'fileurl' or 'url': File URL.
 *                                     'filesize': Optional. Size of the file.
 * @param {String} [component]     Component the file belongs to.
 * @param {Number} [componentId]   Component ID.
 * @param {Boolean} [timemodified] If set, the value will be used to check if the file is outdated.
 */
.directive('mmGradefile', function($q, $mmUtil, $mmFilepool, $mmWS, $mmSite, $mmApp, $mmEvents, $mmFS, mmCoreDownloaded, mmCoreDownloading,
            mmCoreNotDownloaded, mmCoreOutdated) {

    /**
     * Convenience function to get the file state and set scope variables based on it.
     *
     * @param  {Object} scope          Directive's scope.
     * @param  {String} siteid         Site ID.
     * @param  {String} fileurl        File URL.
     * @param  {Number} [timemodified] File's timemodified.
     * @return {Void}
     */
    function getState(scope, siteid, fileurl, timemodified) {
        return $mmFilepool.getFileStateByUrl(siteid, fileurl, timemodified).then(function(state) {
            var canDownload = $mmSite.canDownloadFiles();
            scope.isDownloaded = state === mmCoreDownloaded || state === mmCoreOutdated;
            scope.isDownloading = canDownload && state === mmCoreDownloading;
            scope.showDownload = canDownload && (state === mmCoreNotDownloaded || state === mmCoreOutdated);
        });
    }

    /**
     * Convenience function to download a file.
     *
     * @param  {Object} scope          Directive's scope.
     * @param  {String} siteid         Site ID.
     * @param  {String} fileurl        File URL.
     * @param  {String} component      Component the file belongs to.
     * @param  {Number} componentid    Component ID.
     * @param  {Number} [timemodified] File's timemodified.
     * @return {Promise}               Promise resolved when file is downloaded.
     */
    function downloadFile(scope, siteid, fileurl, component, componentid, timemodified) {
        if (!$mmSite.canDownloadFiles()) {
            $mmUtil.showErrorModal('mm.core.cannotdownloadfiles', true);
            return $q.reject();
        }

        scope.isDownloading = true;
        return $mmFilepool.downloadUrl(siteid, fileurl, true, component, componentid, timemodified).then(function(localUrl) {
            getState(scope, siteid, fileurl, timemodified); // Update state.
            return localUrl;
        }, function() {
            return getState(scope, siteid, fileurl, timemodified).then(function() {
                if (scope.isDownloaded) {
                    return localUrl;
                } else {
                    return $q.reject();
                }
            });
        });
    }

    function isOriginalsFilesExist(scope, fileurl) {
      $mmFilepool.getFilePathByUrl($mmSite.getId(), fileurl).then(function(path) {
        // split the path
        splitedPath = path.split("filepool");
        // replace the filepool dir by originals
        originalPath = path.replace("filepool", "originals");
        // get the directory contents of the originals dir
        $mmFS.getDirectoryContents(splitedPath[0] + "originals").then(function(files) {
          scope.isOriginalDownloaded = false;
          files.forEach(function(file) {
            if(file.fullPath.includes(originalPath))  {
              scope.isOriginalDownloaded = true;
            }
          });
        });
      });
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/gradefile.html',
        scope: {
            file: '='
        },
        link: function(scope, element, attrs) {
            var fileurl = scope.file.fileurl || scope.file.url,
                filename = scope.file.filename,
                filesize = scope.file.filesize,
                timemodified = attrs.timemodified || 0,
                siteid = $mmSite.getId(),
                component = attrs.component,
                componentid = attrs.componentId,
                observer;

            scope.filename = filename;
            scope.fileicon = $mmFS.getFileIcon(filename);
            getState(scope, siteid, fileurl, timemodified);
            isOriginalsFilesExist(scope, fileurl);

            $mmFilepool.getFileEventNameByUrl(siteid, fileurl).then(function(eventName) {
                observer = $mmEvents.on(eventName, function(data) {
                    getState(scope, siteid, fileurl, timemodified);
                    if (!data.success) {
                        $mmUtil.showErrorModal('mm.core.errordownloading', true);
                    }
                });
            });
            scope.download = function(e, openAfterDownload) {
                e.preventDefault();
                e.stopPropagation();
                var promise;

                if (scope.isDownloading) {
                    return;
                }

                if (!$mmApp.isOnline() && (!openAfterDownload || (openAfterDownload && !scope.isDownloaded))) {
                    $mmUtil.showErrorModal('mm.core.networkerrormsg', true);
                    return;
                }

                if (openAfterDownload) {
                    // File needs to be opened now. If file needs to be downloaded, skip the queue.
                    downloadFile(scope, siteid, fileurl, component, componentid, timemodified).then(function(localUrl) {
                        $mmUtil.openFile(localUrl).catch(function(error) {
                            $mmUtil.showErrorModal(error);
                        });
                    });
                } else {
                    // File doesn't need to be opened (it's a prefetch). Show confirm modal if file size is defined and it's big.
                    promise = filesize ? $mmUtil.confirmDownloadSize(filesize) : $q.when();
                    promise.then(function() {
                        // User confirmed, add the file to queue.
                        $mmFilepool.invalidateFileByUrl(siteid, fileurl).finally(function() {
                            scope.isDownloading = true;
                            $mmFilepool.addToQueueByUrl(siteid, fileurl, component, componentid, timemodified);
                        });
                    });
                }
            };

            scope.downloadOriginals = function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Don't wan't to modify the lang files for this one
                $mmUtil.showConfirm("This is the original file, any modification won't be save", "Original File").then(function() {
                  if (scope.isDownloading) {
                      return;
                  }
                  return $mmFilepool.downloadUrl(siteid, fileurl, true, component, componentid, timemodified).then(function(localUrl) {
                      // fixe the url
                      $mmFilepool._fixPluginfileURL($mmSite.getId(), fileurl).then(function(fixedUrl) {
                          // get basePath
                          $mmFS.getBasePath().then(function(basePath) {
                            // remove basePath from the localUrl
                            // (because of downloadFile)
                            localUrlWithoutBasePath = localUrl.split(basePath)[1];
                            // reconstruct the localUrl by changing the saved dir (filepool) by another (original)
                            localUrl = localUrlWithoutBasePath.replace('filepool', 'originals');
                            // download the file
                            // (downloadFile's function doesn't work if the localUrl has the basePath)
                            return $mmWS.downloadFile(fixedUrl, localUrl).then(function() {
                              // add the basepath and the local url and then open it
                              // (openFile's function need the basePath to open the file)
                              isOriginalsFilesExist(scope, fileurl);
                              console.log(scope.isOriginalDownloaded);
                              $mmUtil.openFile(basePath + localUrl).catch(function(error) {
                                  $mmUtil.showErrorModal(error);
                              });
                            });
                          });
                      });
                  });
                });
            };

            scope.setOriginal = function(e) {
              e.preventDefault();
              e.stopPropagation();
              var originalPath;
              var splitedPath;
              $mmUtil.showConfirm("You're about to delete the corrected version of the file and replace it with the original one", "Replace corrected file ?").then(function() {
                $mmFilepool.getFilePathByUrl($mmSite.getId(), fileurl).then(function(path) {
                  // split the path
                  splitedPath = path.split("filepool");
                  // replace the filepool dir by originals
                  originalPath = path.replace("filepool", "originals");
                  // get the directory contents of the originals dir
                  $mmFS.getDirectoryContents(splitedPath[0] + "originals").then(function(files) {
                    files.forEach(function(file) {
                      if(file.fullPath.includes(originalPath))  {
                        // remove the file in the filepool dir
                        $mmFS.removeFile(path).then(function() {
                          // move the original's file to the filepool area
                          $mmFS.moveFile(file.fullPath, path);
                        });
                      }
                    });
                  });
                });
              });
            };

            scope.$on('$destroy', function() {
                if (observer && observer.off) {
                    observer.off();
                }
            });
        }
    };
});
