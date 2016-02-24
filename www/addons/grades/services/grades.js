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
* Service to handle grades.
*
* @module mm.addons.grades
* @ngdoc service
* @name $mmaGrades
*/

.config(function($mmAppProvider, mmaGradingInfo) {
  var stores = [
    {
      name: mmaGradingInfo,
      keyPath: ['uniqueId'],
      indexes: [
        {
          name: 'uniqueId',
        },
        {
          name: 'userid',
        },
        {
          name: 'grade',
        },
        {
          name: 'comment',
        },
        {
          name: 'files_filemanager',
        },
        {
          name: 'file',
        }
      ]
    }
  ];
  $mmAppProvider.registerStores(stores);
})

.factory('$mmaGrades', function($q, $log, $mmFilepool, $mmSite, $mmText, $ionicPlatform, $translate, $mmCourse, $mmCourses, $mmApp, mmaGradingInfo) {

  $log = $log.getInstance('$mmaGrades');

  var self = {};

  /**
  * Add the grades from the mmApp bd.
  *
  * @module mm.addons.grades
  * @ngdoc method
  * @name $mmaGrades#addGrade
  * @param {String} assign       The assignment id.
  * @param {Array} grades        The grades data
  * @return {Promise}
  */
  self.addGrade = function(assign, grades, Ids) {
    var data = {
      assignmentid: assign,
      applytoall: 0,
      grades: grades
    };
    return $mmSite.write('mod_assign_save_grades', data).then(function() {
      Ids.foreach(function(uniqueId) {
        return $mmApp.getDB().remove(mmaGradingInfo, uniqueId);
      });
    });
  };

  /**
  * Add a grade to the mmApp bd (grading_info)
  *
  * @module mm.addons.grades
  * @ngdoc method
  * @name $mmaGrades#saveGrade
  * @param {Array} grades        The grades data
  * @return {Promise}
  */
  self.saveGrade = function(uniqueId, userid, grade, comment, files_filemanager, file) {
    return $mmApp.getDB().insert(mmaGradingInfo, {
      uniqueId: uniqueId,
      userid: userid,
      grade: grade,
      comment: comment,
      files_filemanager: files_filemanager,
      file : file
    }
  );
};


/**
* Get the local path of a file
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#getLocalSubmissionFile
* @param {Object} submission       The file's submission
* @return {Promise}                localfiles
*/
self.getLocalSubmissionFile = function(submission) {
  var files = [];
  var localFiles = [];
  if (submission.plugins) {
    submission.plugins.forEach(function(plugin) {
      if (plugin.type == 'file' && plugin.fileareas[0].files) {
        files = plugin.fileareas[0].files;
      }
    });
  }
  if (files.length > 0) {
    files.forEach(function(file) {
      var uniqueId = $mmFilepool._getFileIdByUrl(file.fileurl);

      var path = $mmFilepool._getFilePath($mmSite.getId(), uniqueId);
      var fileWithLocalPath;
      if (path) {
        fileWithLocalPath = file;
        fileWithLocalPath.localpath = path;
        localFiles.push(fileWithLocalPath);
      }
    });
  }
  return localFiles;
};

/**
* Upload he local files too moodle
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#uploadFiles
* @param {Object} file       The file to upload
* @param {Int} id            The itemID
* @return {Promise}
*/
self.uploadFiles = function(file, id) {
  var data = {
    component: "user",
    filearea: "draft",
    itemid: id,
    filepath: file.localpath,
    filename: file.filename,
    filecontent: "Mettre un truc ici",
    contextlevel: "user",
    instanceid : $mmSite.getUserId()
  };
  return $mmSite.write('core_files_upload', data);
};

self.downloadAll = function() {
  console.log("telechargement");
};
/**
* Formats the response of gradereport_user_get_grades_table to be rendered.
*
* @param  {Object}  table      JSON object representing a table with data.
* @param  {Boolean} showSimple True if simple table should be shown, false for full table.
* @return {Object}             Formatted HTML table.
*/
function formatGradesTable(table, showSimple) {
  var formatted = {
    columns: [],
    rows: []
  };

  if (!table || !table.tables) {
    return formatted;
  }

  // Columns, by order.
  var columns = [ "itemname", "weight", "grade", "range", "percentage", "lettergrade", "rank",
  "average", "feedback", "contributiontocoursetotal"];
  var returnedColumns = [];
  var tabledata = [];
  var maxDepth = 0;
  // Check columns returned (maybe some of the above).
  if (table.tables && table.tables[0] && table.tables[0]['tabledata']) {
    tabledata = table.tables[0]['tabledata'];
    var l = tabledata.length;
    for(var i=1; i < l-1;i++){
      if(tabledata[i].itemname.content.indexOf("quiz")=== -1){
        tabledata[i].itemname.content = "> "+tabledata[i].itemname.content;
      }
    }
    maxDepth = table.tables[0]['maxdepth'];
    for (var el in tabledata) {
      // This is a typical row.
      if (!angular.isArray(tabledata[el]) && typeof(tabledata[el]["leader"]) === "undefined") {
        for (var col in tabledata[el]) {
          returnedColumns.push(col);
        }
        break;
      }
    }
  }

  if (returnedColumns.length > 0) {

    // Reduce the returned columns for phone version.
    if (showSimple) {
      returnedColumns = ["itemname", "grade", "state"];
    }

    for (var el in columns) {
      var colName = columns[el];
      if (returnedColumns.indexOf(colName) > -1) {
        var width = colName == "itemname" ? maxDepth : 1;
        var column = {
          id: colName,
          name: colName,
          width: width
        };
        formatted.columns.push(column);
      }
    }

    var name, rowspan, tclass, colspan, content, celltype, id, headers,j, img, colspanVal;

    var len = tabledata.length;
    for (var i = 0; i < len; i++) {
      var row = '';
      if (typeof(tabledata[i]['leader']) != "undefined") {
        rowspan = tabledata[i]['leader']['rowspan'];
        tclass = tabledata[i]['leader']['class'];
        row += '<td class="' + tclass + '" rowspan="' + rowspan + '"></td>';
      }
      for (el in returnedColumns) {
        name = returnedColumns[el];

        if (typeof(tabledata[i][name]) != "undefined") {

          tclass = (typeof(tabledata[i][name]['class']) != "undefined")? tabledata[i][name]['class'] : '';
          colspan = (typeof(tabledata[i][name]['colspan']) != "undefined")? "colspan='"+tabledata[i][name]['colspan']+"'" : '';
          content = (typeof(tabledata[i][name]['content']) != "undefined")? tabledata[i][name]['content'] : null;
          celltype = (typeof(tabledata[i][name]['celltype']) != "undefined")? tabledata[i][name]['celltype'] : 'td';
          id = (typeof(tabledata[i][name]['id']) != "undefined")? "id='" + tabledata[i][name]['id'] +"'" : '';
          headers = (typeof(tabledata[i][name]['headers']) != "undefined")? "headers='" + tabledata[i][name]['headers'] + "'" : '';
          if (typeof(content) != "undefined") {
            img = getImgHTML(content);
            content = content.replace(/<\/span>/gi, "\n");
            content = $mmText.cleanTags(content);
            content = content.replace("\n", "<br />");
            content = img + " " + content;
            row += "<" + celltype + " " + id + " " + headers + " " + "class='"+ tclass +"' " + colspan +">";
            row += content;
            row += "</" + celltype + ">";
          }
        }
      }
      formatted.rows.push(row);
    }
  }

  return formatted;
}

/**
* Gets the HTML code to render the contents img.
*
* @param  {String} text HTML where the image will be rendered.
* @return {String}      HTML code to render the image.
*/
function getImgHTML(text) {
  var img = '';

  if (text.indexOf("/agg_mean") > -1) {
    img = '<img src="addons/grades/img/agg_mean.png" width="16">';
  } else if (text.indexOf("/agg_sum") > -1) {
    img = '<img src="addons/grades/img/agg_sum.png" width="16">';
  } else if (text.indexOf("/outcomes") > -1) {
    img = '<img src="addons/grades/img/outcomes.png" width="16">';
  } else if (text.indexOf("i/folder") > -1) {
    img = '<img src="addons/grades/img/folder.png" width="16">';
  } else if (text.indexOf("/manual_item") > -1) {
    img = '<img src="addons/grades/img/manual_item.png" width="16">';
  } else if (text.indexOf("/mod/") > -1) {
    var module = text.match(/mod\/([^\/]*)\//);
    if (typeof module[1] != "undefined") {
      var moduleSrc = $mmCourse.getModuleIconSrc(module[1]);
      img = '<img src="' + moduleSrc + '" width="16">';
    }
  }
  if (img) {
    img = '<span class="app-ico">' + img + '</span>';
  }
  return img;
}

/**
* Translates the names of the grades table columns.
*
* @param  {Object} table Grades table.
* @return {Promise}      Promise to be resolved with the translated table.
*/
function translateGradesTable(table) {
  var columns = angular.copy(table.columns),
  promises = [];

  columns.forEach(function(column) {
    var promise = $translate('mma.grades.'+column.name).then(function(translated) {
      column.name = translated;
    });
    promises.push(promise);
  });

  return $q.all(promises).then(function() {
    return {
      columns: columns,
      rows: table.rows
    };
  });
}

/**
* Check if the user has capability
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#hasCapabilities
* @param {Number} courseid ID of the course to get the grades from.
* @return {Boolean} True is it's a teacher, false otherwise.
*/
self.hasCapabilities = function(courseid) {

  var params = {
    coursecapabilities:
    [{
      courseid:courseid,
      capabilities:['moodle/grade:viewall']
    }],
    options:
    [{
      name: "userfields",
      value: "id"
    }]
  };
  preSets = {};

  if($mmSite.wsAvailable('core_enrol_get_enrolled_users_with_capability')) {

    return $mmSite.read('core_enrol_get_enrolled_users_with_capability', params, preSets).then(function(dat){
      var canSeeAllGrades = false;
      for(var i=0 ; i<dat[0].users.length ; i++) {
        if($mmSite.getUserId() == dat[0].users[i].id)
        canSeeAllGrades = true;
      }
      return canSeeAllGrades;
    });
  }
};


/**
* Return a list of participant enrolled in a course
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#getParticipants
* @param {Number} courseid ID of the course to get the grades from.
* @return {Promise}        Promise to be resolved when the list of participants is retrieved.
*/
self.getParticipants = function(courseid, refresh) {

  var wsName = {
    courseid: courseid
  }, presets = {};
  if (refresh) {
    presets.getFromCache = false;
  }
  if ($mmSite.wsAvailable('core_enrol_get_enrolled_users')) {
    return $mmSite.read('core_enrol_get_enrolled_users', wsName, presets).then(function(users) {
      return users;
    });
  }
};

/**
* Get an assignment.
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#getAssignment
* @param {Number} courseid   Course ID the assignment belongs to.
* @param {Boolean} [refresh] True when we should not get the value from the cache.
* @return {Promise}          Promise resolved with the assignment.
*/
self.getAssignment = function(courseid, refresh) {
  var params = {
    "courseids": [courseid]
  },
  preSets = {};

  if (refresh) {
    preSets.getFromCache = false;
  }

  return $mmSite.read('mod_assign_get_assignments', params, preSets).then(function(response) {
    if (response.courses && response.courses.length) {
      var assignments = response.courses[0].assignments;

      for (var i = 0; i < assignments.length; i++) {
        return assignments;
      }
      return $q.reject();
    } else {
      return $q.reject();
    }
  });
};

/**
* Returns whether or not the plugin is enabled for the current site.
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#isPluginEnabled
* @return {Boolean} True if plugin is enabled, false otherwise.
*/
self.isPluginEnabled = function() {
  return $mmSite.wsAvailable('gradereport_user_get_grades_table');
};

/**
* Returns whether or not the grade addon is enabled for a certain course.
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#isPluginEnabledForCourse
* @param {Number} courseId Course ID.
* @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
*/
self.isPluginEnabledForCourse = function(courseId) {
  if (!courseId) {
    return $q.reject();
  }

  return $mmCourses.getUserCourse(courseId, true).then(function(course) {
    if (course && typeof course.showgrades != 'undefined' && !course.showgrades) {
      return false;
    }
    return true;
  });
};

/**
* Get the grades for a certain course.
* For now we only support gradereport_user_get_grades_table. It returns the complete grades table.
*
* @module mm.addons.grades
* @ngdoc method
* @name $mmaGrades#getGradesTable
* @param {Number} courseid ID of the course to get the grades from.
* @param {Number} userid   ID of the user to get the grades from.
* @param {Boolean} refresh True when we should not get the value from the cache.
* @return {Promise}        Promise to be resolved when the grades table is retrieved.
*/
self.getGradesTable = function(courseid, userid, refresh) {

  $log.debug('Get grades for course ' + courseid + ' and user ' + userid);

  var data = {
    courseid : courseid,
    userid   : userid
  },
  presets = {};
  if (refresh) {
    presets.getFromCache = false;
  }

  return $mmSite.read('gradereport_user_get_grades_table', data, presets).then(function(table) {
    table = formatGradesTable(table, !$ionicPlatform.isTablet());
    return translateGradesTable(table);
  });
};

return self;
});
