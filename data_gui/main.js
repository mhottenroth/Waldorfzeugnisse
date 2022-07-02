/**********************
* Debugging funtions. *
**********************/
document.addEventListener("keypress", function(e){
  if (e.key == "#"){
    console.log(SESSION)
    console.log(document.getElementById("saveSession_prompt"))
  }
});


/********************************************************
* Initiate the session and set some element attributes. *
********************************************************/

const OS = window.navigator['oscpu']

if (OS.match("Windows")){
  document.getElementById("scriptType").innerText = "Batchdatei (*.bat)"
} else {
  document.getElementById("scriptType").innerText = "Shellskriptdatei (*.sh)"
}

// Clear all textareas.
var textareas = document.getElementsByTagName("textarea")
for (t in textareas){
  textareas[t].value = ""
}

// Clear all inputs.
var inputs = document.getElementsByTagName("input")
for (i in inputs){
  inputs[i].value = ""
}

var SESSION = []

var SESSIONS_imported = []

// Information needed for generating the batch/shell script which creates the final certificates.
var SESSION_SAVEPATH = ""
const BASEDIR = window.document.location.pathname.match("^(.*/)")[0]

addPupil("Max", "Muster")
document.getElementsByName("radio_pupil")[0].checked = true
document.getElementById("togglePrintAll").checked = true

addSubject("leeres Fach")
document.getElementById("list_subjects").selectedIndex = 0
document.getElementById("input_subjectName").value = "leeres Fach"
document.getElementById("button_moveSubjectDown").disabled = true
document.getElementById("button_moveSubjectUp").disabled = true

updateSubjectPanel()
updateFinalRemarksPanel()

document.getElementById("specialPageSelector").selectedIndex = 0
document.getElementById("button_addSpecialPage").disabled = true

SESSION.class = ""
SESSION.year = ""
SESSION.date = ""
SESSION.place = "Leipzig"

// Disable various input elements.
//document.getElementById("button_deleteSubject").disabled = true


// Fill some forms initially.
var d = new Date();

console.log(d)

var a = document.getElementById("label_year");
a.innerText = ((d.getFullYear() - 1).toString() + "/" + (d.getFullYear().toString()).match(/\d\d$/));
SESSION.year = a.innerText
document.getElementById("overlay_calendar_year").innerText = d.getFullYear()

var monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
var weekdayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


var a = document.getElementById("input_date");
a.value = (d.getDate().toString() + "." + (d.getMonth() + 1).toString().padStart(2, '0') + "." + d.getFullYear().toString());
if (a.value.match(/^[0-9]\./)){
  a.value = "0" + a.value
}
SESSION.date = a.value
document.getElementById("overlay_calendar_month").innerText = monthNames[d.getMonth()]

document.getElementById("input_place").value = "Leipzig"



/***************************************************
* General functions (non-input-element callbacks). *
***************************************************/


function objToString(obj){
  if (typeof(obj) == "object"){
    var s = ""
    for (p in obj){
      if (! /^[0-9]+$/.test(p)){
        s = s + "SESSION." + p + " = " + "\"" + SESSION[p] + "\";\n"
      } else {
        s = s + "SESSION[" + p + "] = " + "\"" + SESSION[p] + "\";\n"
      }
    }
    var lines = s.match(/.*\n/g)
    for (var l = 0; l < lines.length; l++){
      //console.log("Checking line " + lines[l])
      if (lines[l].includes('[object Object]')){
        var prefix = lines[l].match(/^[^ ]*/).toString()
        var expObjString = ""
        var array = eval(prefix)
        //console.log("Prefix: " + prefix)
        //console.log("Type: " + typeof(eval(prefix)))
        for (k in array){
          if (! /^[0-9]+$/.test(k)){
            k = '.' + k
          } else {
            k = '[' + k + ']'
          }
          value = eval(prefix + k)
          if (k == ".works"){
            console.log("Works! Value: " + Array.isArray(value))
          }
          expObjString = expObjString + prefix + k + " = \"" + value.toString().replace(/\n/g, "\\n") + "\";\n"
        }

        console.log("Prefix: " + prefix + "; array: " + Array.isArray(eval(prefix)))

        if (Array.isArray(eval(prefix))){
          s = s.replace(lines[l], prefix + " = [];\n" + expObjString)
        } else {
          s = s.replace(lines[l], prefix + " = {};\n" + expObjString)
        }
        lines = s.match(/.*\n/g)
      }
    }
    // Remove keys without values, replace multiple linebreaks and semicolons with one each.
    s = s.replace(/SESSION[^=]*= "";/g, "").replace(/\n{2,}/g, '\n').replace(/;{2,}/g, ';')
    return s
  }
}


function getWeekNumber(datestring){
  // datestring is ISO-formatted (YYYYMMDD).
  var year = parseInt(datestring.match(/(^[0-9]{4})/)[1])
  var month = parseInt(datestring.match(/^[0-9]{4}([0-9]{2})/)[1])
  var day = parseInt(datestring.match(/^[0-9]{4}[0-9]{2}([0-9]{2})/)[1])

  var d = new Date(year, month - 1, day)
  
  var firstOfYear = new Date(year, 0, 1)
  // So = 0; Mo = 1 etc. → So = 6; Mo = 0 etc.
  var firstOfYear_weekday = (firstOfYear.getDay() + 6) % 7

  // Add half a day to compensate summer time.
  var week = Math.ceil(( d.valueOf() + 0.5 * 1000 * 3600 * 24 - firstOfYear.valueOf() + firstOfYear_weekday * 1000 * 3600 * 24 ) / 1000 / 3600 / 24 / 7)
  
  return week
}


function deleteExcessSpaces(e){
  e.value = e.value.replace(/^ */, "").replace(/ {2,}/, " ").replace(/ *$/, "")
}


function generatePupilDataset(firstName, lastName){
  var dataset = {
    "firstName": firstName || "",
    "lastName": lastName || "",
    "daysAbsent": "",
    "daysAbsent_unexplained": "",
    "finalRemarks": "",
    "print": true,
    "subjects": []
  }

  var subjects = document.getElementById("list_subjects").options
  for (var s = 0; s < subjects.length; s++){
    dataset.subjects[subjects[s].value] = { 
        "name": subjects[s].innerText
    }
  }
  return dataset
}


function addSubjectToAllPupils(name){
  for (var p = 0; p < SESSION.length; p++){
    var i = document.getElementById("list_subjects").options.length - 1
    console.log("Number of subjects: " + i)
    SESSION[p].subjects[i] = {
      "name": name
    }
  }
}


function getSelectedPupil(index){
  var radio_pupils = document.getElementsByName("radio_pupil")
  if (!index){
    var index = -1
    for (i in radio_pupils){
      if (radio_pupils[i].checked){
        index = i
        break
      }
    }
  }
  var pupils = document.getElementsByClassName("pupilRow")
  var fn = pupils[index].cells[3].children[0].value
  var ln = pupils[index].cells[4].children[0].value

  return {"firstName": fn, "lastName": ln, "index": index}
}


function getSelectedSubject(){
  var index = document.getElementById("list_subjects").selectedIndex
  if (index > -1){
    var name = document.getElementById("list_subjects").options[document.getElementById("list_subjects").selectedIndex].innerText
    return {"name": name, "index": index.toString()}
  }
}



/**********************************
* Header information (meta data). *
**********************************/

function updatePlace(e){
  document.getElementById("place").innerText = e.value.toUpperCase()
  SESSION.place = e.value
}



/********************
* Session routines. *
*********************/


function saveSession(){
  var sessionString = objToString(SESSION)

  console.log("Session after saving: " + sessionString)

  var file = new Blob( [ new TextEncoder().encode( sessionString ) ], { type: 'text/plain;charset=utf-8' } )

  document.getElementById("saveSession_prompt").href = URL.createObjectURL(file)
  var c = (document.getElementById("input_class").value != "" && " Klasse " + document.getElementById("input_class").value) || ""
  document.getElementById("saveSession_prompt").download = c + ", Sitzung.txt"
  document.getElementById("saveSession_prompt").click()
}


function updateSession_class(e){
  SESSION.class = e.value
}


function updateSession_firstName(e){
  var index = e.parentNode.parentNode.cells[2].children[0].innerText
  SESSION[index - 1].firstName = e.value.replace(/ *$/, '').replace(/  */, '')
}


function updateSession_lastName(e){
  var index = e.parentNode.parentNode.cells[2].children[0].innerText
  SESSION[index - 1].lastName = e.value.replace(/ *$/, '').replace(/  */, '')
}


function updateSession_subjectName(){
  var list = document.getElementById("list_subjects")
  var index = list.selectedIndex
  var value = list.options[index].innerText

  for (var p = 0; p < SESSION.length; p++){
    SESSION[p].subjects[index].name = value.replace(/ *$/, '').replace(/  */, '')
  }
}


function updateSession_togglePrint(e){
  var index = e.parentNode.parentNode.cells[2].children[0].innerText
  SESSION[index - 1].print = ! SESSION[index - 1].print
}


function updateSession_togglePrintAll(e){
  for (var p = 0; p < SESSION.length; p++){
    SESSION[p].print = e.checked 
  }
}


function updateSession_subjectContents(e){
  SESSION[getSelectedPupil().index].subjects[getSelectedSubject().index].contents = e.value
}


function updateSession_subjectEvaluation(e){
  SESSION[getSelectedPupil().index].subjects[getSelectedSubject().index].evaluation = e.value
}


function updateSession_subjectTeacher(e){
  SESSION[getSelectedPupil().index].subjects[getSelectedSubject().index].teacher = e.value
}


function updateSession_subjectMark(e){
  SESSION[getSelectedPupil().index].subjects[getSelectedSubject().index].mark = e.value
}


function updateSession_pupilDaysAbsent(e){
  SESSION[getSelectedPupil().index].daysAbsent = e.value
}


function updateSession_pupilDaysAbsent_unexplained(e){
  SESSION[getSelectedPupil().index].daysAbsent_unexplained = e.value
}


function updateSession_pupilFinalRemarks(e){
  SESSION[getSelectedPupil().index].finalRemarks = e.value
}


function updateSession_eurythmieRow_author(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  var index = e.parentNode.parentNode.dataset.index
  
  SESSION[p.index].subjects[s.index].works[index].author = e.value
}


function updateSession_eurythmieRow_work(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  var index = e.parentNode.parentNode.dataset.index
  
  SESSION[p.index].subjects[s.index].works[index].work = e.value
}


function updateSession_pupilJahresarbeit_firstReader(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].firstReader = e.value
}


function updateSession_pupilJahresarbeit_secondReader(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].secondReader = e.value
}


function updateSession_pupilJahresarbeit_topic(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].topic = e.value
}


function updateSession_pupilJahresarbeit_evaluation(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].evaluation = e.value
}


function updateSession_pupilKlassenspiel_contents(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].contents = e.value
}


function updateSession_pupilKlassenspiel_evaluation(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].evaluation = e.value
}


function updateSession_finalEurythmy_evaluation(e){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  
  SESSION[p.index].subjects[s.index].evaluation = e.value
}


function chooseSessionsToMerge(e){
  const files = e.files

  // Reset the lists shown in this dialog.
  document.getElementById("message_import_newPupils").innerText = ""
  document.getElementById("message_import_newSubjects").innerText = ""

  // Clear the variable for imported sessions.
  SESSIONS_imported = []


  for (i = 0; i < files.length; i++){
    var reader = new FileReader();      

    reader.onload = function(e){
      // The whole imported session as a string.
      SESSIONS_imported[SESSIONS_imported.length] = e.target.result;

      console.log(SESSIONS_imported + ", Länge: " + SESSIONS_imported.length)

      // Proceed as soon as all files were loaded.
      if (SESSIONS_imported.length == files.length){

        var overlay_pupilsList = ""
        var overlay_subjectsList = ""
        
        for (i = 0; i < SESSIONS_imported.length; i++){
          // Get a list of new pupils.
          var re = new RegExp('SESSION\\[[0-9]+\\]\.firstName = "[^"]*";SESSION\\[[0-9]+\\]\.lastName = "[^"]*"', 'g')
          var finds = SESSIONS_imported[i].match(re)
          for (j = 0; j < finds.length; j++){
            var fn = finds[j].match(/(?<=firstName = ")[^"]*/)
            var ln = finds[j].match(/(?<=lastName = ")[^"]*/)
            if (! overlay_pupilsList.match(fn + " " + ln + ";") && ! JSON.stringify(SESSION).match('"firstName":"' + fn + '","lastName":"' + ln + '"')){
              console.log("Gefundener Schüler ist neu! " + fn + " " + ln)
              console.log(JSON.stringify(SESSION))
              overlay_pupilsList += "– " + fn + " " + ln + ";"
            } else {
              console.log("Not adding " + fn + " " + ln + ", because it’s already in the session or in another imported file.")
            }
          }
          
          // Get a list of new subjects.
          re = new RegExp('SESSION\\[0\\]\.subjects\\[[0-9]*\\].name = "[^"]*"', 'g')
          finds = SESSIONS_imported[i].match(re)
          for (j = 0; j < finds.length; j++){
            var name = finds[j].match(/(?<=name = ")[^"]*/)
            if (! overlay_subjectsList.match("– " + name + ";")){
              overlay_subjectsList += "– " + name + ";"
            }
          }
        }

        if (overlay_pupilsList == ""){
          document.getElementById("message_import_newPupils").innerHTML = "– <i>keine</i> –"
        } else {
          document.getElementById("message_import_newPupils").innerText = overlay_pupilsList.replace(/;/g, "\n")
        }

        document.getElementById("message_import_newSubjects").innerText = overlay_subjectsList.replace(/;/g, "\n")

        // Make the import dialog overlay visible and renew its position.
        document.getElementById("overlay_background").style.visibility = "visible"
        document.getElementById("overlay_background").style.opacity = 0.5
        document.getElementById("overlay_infocanvas").style.visibility = "visible"
        document.getElementById("overlay_infocanvas").style.opacity = 1

        document.getElementById("overlay_infocanvas").style.top = 0.5 * window.innerHeight - 0.5 * document.getElementById("overlay_infocanvas").offsetHeight
      }
    };

    reader.onerror = function(e){
      console.log(e.target.error.name);
    }

    reader.readAsText(files[i]);
  }
}


function importSessions(e){
  overlay_mergeImport_close()

  for (s = 0; s < SESSIONS_imported.length; s++){
    // Add pupils who haven’t been in the session before.
    var re = new RegExp('SESSION\\[[0-9]+\\]\.firstName = "[^"]*";SESSION\\[[0-9]+\\]\.lastName = "[^"]*"', 'g')
    var finds = SESSIONS_imported[s].match(re)
    for (i = 0; i < finds.length; i++){
      var fn = finds[i].match(/(?<=firstName = ")[^"]*/)[0]
      var ln = finds[i].match(/(?<=lastName = ")[^"]*/)[0]
      if (! JSON.stringify(SESSION).match('"firstName":"' + fn + '","lastName":"' + ln + '"')){
        addPupil(fn, ln)
      }
    }

    // Add subject info from the imported session.
    re = new RegExp('SESSION\\[0\\]\.subjects\\[[0-9]+\\].name = "[^"]*"', 'g')
    finds = SESSIONS_imported[s].match(re)
    for (i = 0; i < finds.length; i++){
      var name_subject = finds[i].match(/(?<=name = ")[^"]*/)[0]
      // Add the subject to the session if not already present.
      if (! JSON.stringify(SESSION[0].subjects).match('"name":"' + name_subject + '"')){
        addSubject(name_subject)
      }
      // Iterate over all pupils in SESSION, get their session index from SESSION_imported and write SESSION_imported’s subject info to SESSION for that pupil.
      for (j = 0; j < SESSION.length; j++){
        var pFirstName = SESSION[j].firstName
        var pLastName = SESSION[j].lastName

        //console.log("Suche nach " + pFirstName + " " + pLastName + " in der Sitzung.")
        
        re = new RegExp('SESSION\\[[0-9]+\\]\.firstName = "' + pFirstName + '";SESSION\\[[0-9]+\\]\.lastName = "' + pLastName + '"')
        var index_pupil_imported = SESSIONS_imported[s].match(re)
        
        // If the pupil has an index in the imported session (Religion might be an example for imported subjects which don’t contain all pupils), …
        if (index_pupil_imported){
          index_pupil_imported = index_pupil_imported[0].match(/(?<=SESSION\[)[0-9]+(?=\])/)
          
          // … get the subject’s index in the imported session and … 
          re = new RegExp('SESSION\\[' + index_pupil_imported + '\\].subjects\\[[0-9]+\\]\.name = "' + name_subject + '"')
          var index_subject_imported = SESSIONS_imported[s].match(re)[0].match(/(?<=\.subjects\[)[0-9]+(?=\])/)
          console.log("Index für " + name_subject + " in der importierten Sitzung: " + index_subject_imported)
      
          // … the subject’s index in the current session.
          re = new RegExp('.*"name":"' + name_subject + '"')
          var subjects_currentSession = JSON.stringify(SESSION[j].subjects).match(re)[0]
          var index_subject_current = subjects_currentSession.match(/"name":"/g).length - 1
          console.log("Fachindex in der aktuellen Sitzung: " + index_subject_current)

          // Add all keys of the subject to the current session.
          re = new RegExp('SESSION\\[' + index_pupil_imported + '\\]\.subjects\\[' + index_subject_imported + '\\]\.[^ ]* = "[^"]*"', "g")
          var keys = SESSIONS_imported[s].match(re)
          for (k = 0; k < keys.length; k++){
            var key = keys[k].match(/(?<=\]\.)[^. ]*(?= )/)[0]
            re = new RegExp('\.' + key + ' = ".*')
            var value = keys[k].match(re)[0].match(/(?<= = ").*(?="$)/)[0]
            SESSION[j].subjects[index_subject_current][key] = value
          }

        }            
      }
    }
  }

  updateSubjectPanel()
}


function chooseSessionToLoad(e){
  const file = e.files[0]

  if (file){
    var reader = new FileReader()

    reader.onload = function(e){
      // Renew the SESSION variable.
      var session_new = e.target.result
      SESSION = []
      eval(session_new)

      // Reset the pupils list.
      while (document.getElementById('t01').rows.length != 2){
        document.getElementById('t01').deleteRow(2);
        console.log("Deleting row.")
      };

      // Add the new pupils from the loaded session.
      for (p = 0; p < SESSION.length; p++){
        var fn = SESSION[p].firstName
        var ln = SESSION[p].lastName
        addPupil(fn, ln, true)
        console.log("p: " + p)
      }
      document.getElementsByName('radio_pupil')[0].checked = "true"
      updateFinalRemarksPanel()

      // Reset the subjects list.
      while (document.getElementById("list_subjects").length != 0){
        document.getElementById("list_subjects").remove(0)
      };

      // Add the new subjects from the loaded session.
      console.log(SESSION[0].subjects)
      console.log(SESSION[0].subjects.length)
      console.log(SESSION[0].subjects[0].name)
      for (s in SESSION[0].subjects){
        console.log("Fachnummer: " + s)
        var name_subject = SESSION[0].subjects[s].name
        console.log(name)
        addSubject(name_subject, true)
      }
      document.getElementById("list_subjects").selectedIndex = 0
      document.getElementById("input_subjectName").value = document.getElementById("list_subjects")[0].innerText
      document.getElementById("button_moveSubjectUp").disabled = true
      updateSubjectPanel()

      // Set the special input values class, year and date.
      document.getElementById("input_class").value = SESSION.class || ""
      document.getElementById("label_year").innerText = SESSION.year || ""
      document.getElementById("input_date").value = SESSION.date || ""



    }

    reader.readAsText(file)
  }
}



/************************
* Pupil panel routines. *
*************************/


function addPupil(firstName, lastName, guionly){
  var fn = firstName || "";
  var ln = lastName || "";

  var lastListIndex = document.getElementsByClassName("pupilRow").length;
  var newRow = document.createElement('TR');
  newRow.classList.add("pupilRow");
  newRow.innerHTML = '<td align=right><button type="button" title="Schüler aus der Liste löschen" onclick="deletePupil(this); updateFinalRemarksPanel()">Löschen</td>\
    <td align=center class="checkboxCell"><input type="checkbox" name="printPupilCheckbox" checked onclick="updateSession_togglePrint(this)"><label class="afterCheckboxLabel"></td>\
    <td align=right><span>' + (lastListIndex + 1) + '</span></td>\
    <td><input type="text" class="input_name" onchange="deleteExcessSpaces(this)" value="' + fn + '" oninput="updateSession_firstName(this); updateFinalRemarksPanel(); updateSubjectPanel()" onchange="deleteExcessSpaces(this)"></td>\
    <td><input type="text" class="input_name" onchange="deleteExcessSpaces(this)" value="' + ln + '" oninput="updateSession_lastName(this)" onchange="deleteExcessSpaces(this)"></td>\
    <td align=center class="radioCell"><input type="radio" onclick="updateSubjectPanel(); updateFinalRemarksPanel()" name="radio_pupil"><label class="afterRadioLabel"></label></td>'
  document.getElementById('t01').getElementsByTagName('tbody')[0].appendChild(newRow);

  console.log(document.getElementById('t01').offsetHeight)

  // Enable the »Delete« button for the first pupil in the list.
  if (lastListIndex > 0){
    document.getElementsByClassName("pupilRow")[0].cells[0].children[0].disabled = ""
  } else {
    document.getElementsByClassName("pupilRow")[0].cells[0].children[0].disabled = true
  }

  // Add pupil to the SESSION variable
  if (! guionly){
    SESSION[SESSION.length] = generatePupilDataset(fn, ln)
  }
};


function deletePupil(e, index){
  var deletedIndex = "";
  if (index){
    deletedIndex = index;
  } else {
    deletedIndex = parseInt(e.parentElement.parentElement.cells[2].innerText)
  };
  if (e.parentElement.parentElement.cells[5].children[0].checked){
    // If the last element in the list is checked and deleted …
    if (deletedIndex + 1 == e.parentElement.parentElement.parentElement.rows.length - 1){
      // … and the last element is not the first and only one, …
      if (deletedIndex > 1){
        // …, then check it.
        e.parentElement.parentElement.parentElement.parentElement.rows[deletedIndex].cells[5].children[0].checked = "true"
      }
    } else {
      // Check the next element in line (same index as the later deleted).
      e.parentElement.parentElement.parentElement.parentElement.rows[deletedIndex + 2].cells[5].children[0].checked = "true"
    }
  }
  document.getElementById('t01').deleteRow(deletedIndex + 1);
  var pupilsList = document.getElementsByClassName('pupilRow');
  for (var i = deletedIndex - 1; i < pupilsList.length; i++){
    pupilsList[i].cells[2].children[0].innerText = (parseInt(pupilsList[i].cells[2].children[0].innerText) - 1).toString();
  }

  if (document.getElementsByClassName("pupilRow").length == 1){
    document.getElementsByClassName("pupilRow")[0].cells[0].children[0].disabled = "true"
  }

  SESSION[deletedIndex - 1] = null
  console.log("Deleted index: " + deletedIndex)
  for (var p = deletedIndex - 1; p < SESSION.length; p++){
    SESSION[p] = SESSION[p+1]
  }
  SESSION.length = SESSION.length - 1
}


function importPupils(e){
  SESSION.length = 0
  if (e.files.length == 0){
    return;
  };
  var reader = new FileReader();
  reader.onload = (e) => {
    const file = e.target.result;
    var lines = {}
    if (file.match(";")){
      lines = file.split(";")
    } else {
      lines = file.split(/\r\n|\n/);
    }
    while (document.getElementById('t01').rows.length != 2){
      document.getElementById('t01').deleteRow(2);
    };

    for (l in lines){
      // Delete double, trailing, and leading spaces (only needed for newline separated names from legacy lists).
      lines[l] = lines[l].replace(/[ ]{2,}/, " ").replace(/ *$/, "").replace(/^ */, "");

      var last = ""
      var first = ""

      if (lines[l].match(",")){
        // Branch for the new pupil lists.
        first = lines[l].replace(/^[^,]*,/, "")
        last = lines[l].replace(/,.*/, "")
      } else {
        // Branch for legacy lists (newline separated names).
        last = lines[l].match(/[^ ]*$/)[0];
        first = lines[l].replace(' ' + last, "");
      }

      if (first != "" && last != ""){
        addPupil(first, last);
      }
    }
    document.getElementsByName('radio_pupil')[0].checked = "true"
    updateFinalRemarksPanel()

    if (getSelectedSubject() && getSelectedSubject().name){
      updateSubjectPanel()
    } else {
      console.log("Not found! getSelectedSubject")
      console.log(getSelectedSubject())
    }
  };

  reader.onerror = (e) => alert(e.target.error.name);
  reader.readAsText(e.files[0]);
};


function checkbox_togglePrintAll(e){
  var printPupilCheckboxes = document.getElementsByName("printPupilCheckbox");
  if (e.checked){
    for (c in printPupilCheckboxes){
      if (c.match(/^[0-9]*$/)){
        printPupilCheckboxes[c].checked = "true"
      }
    }
  } else {
    for (c in printPupilCheckboxes){
      if (c.match(/^[0-9]*$/)){
        printPupilCheckboxes[c].checked = ""
      }
    }
  }
};


function exportPupilsList(){
  var s = ""
  var pupils = document.getElementsByClassName("pupilRow")

  for (p in pupils){
    if (pupils[p].children){
      s = s + pupils[p].children[4].children[0].value + "," + pupils[p].children[3].children[0].value + ";"
    }
  }

  document.getElementById("exportPupilsList_prompt").href = 'data:text/plain;charset=utf-8,' + s
  document.getElementById("exportPupilsList_prompt").click()
}



/**************************
* Subject panel routines. *
**************************/


function enableDisableAddSpecialPageButton(e){
  var b = document.getElementById("button_addSpecialPage")
  if (e.selectedIndex > 0){
    b.disabled = ""
  } else {
    b.disabled = "true"
  }
}


function addSpecialPage(e){
  var selector = document.getElementById("specialPageSelector")
  addSubject("Sonderseite: " + selector.value)

  // Add unique array fields for the special subject to all pupils.
  if (selector.value == "Eurythmieabschluss"){
    var index = document.getElementById("list_subjects").length - 1
    for (p = 0; p < SESSION.length; p++){
      // Reset the eurythmie works table.
      var t = document.getElementById("eurythmieTable")
      for (r = 1; r < t.rows.length; r++){
        t.deleteRow(r)
      }
      SESSION[p].subjects[index].works = []
    }
  }

  if (selector.value == "Jahresarbeit"){
    
  }

  if (selector.value == "Klassenspiel"){
    // None needed. Klassenspiel uses only »contents« and »evaluation« field.
  }      

  selector[selector.selectedIndex].disabled = true
  selector[selector.selectedIndex].title = "Dieses Fach ist bereits gelistet."
  selector.selectedIndex = 0
  e.disabled = true
}


function enableDisableMoveSubjectButtons(){
  var list = document.getElementById("list_subjects");
  if (list.length == 1){
    document.getElementById("button_moveSubjectDown").disabled = true
    document.getElementById("button_moveSubjectUp").disabled = true
  } else {
    document.getElementById("button_moveSubjectDown").disabled = ""
    document.getElementById("button_moveSubjectUp").disabled = ""
    if (list.selectedIndex == 0){
      document.getElementById("button_moveSubjectUp").disabled = true
    }
    if (list.selectedIndex == list.length - 1){
      document.getElementById("button_moveSubjectDown").disabled = true
    }
  }
}


function addSubject(name, guionly){
  var name = name || "leeres Fach"
  var list = document.getElementById("list_subjects");
  var opt = document.createElement("option");
  opt.text = name;
  opt.value = list.length.toString();
  list.add(opt);

  if (name.match(/^Sonderseite/)){
    var list = document.getElementById("specialPageSelector").options
    for (i in list){
      if (name.match("Sonderseite: " + list[i].innerText)){
        list[i].disabled = "true"
        break
      }
    }
  }
  
  // Add the new subject to all pupils of the SESSION variable.
  if (! guionly){
    addSubjectToAllPupils(name)
  }

  console.log(list.length)
  if (list.length > 1){
    document.getElementById("button_deleteSubject").disabled = ""
  } else {
    document.getElementById("button_deleteSubject").disabled = true
  }

  // Enable and disable the move-subject-buttons.
  enableDisableMoveSubjectButtons()
}


function updateSubjectNameInput(e){
  if (e.selectedIndex > -1){
    var value = e.options[e.selectedIndex].innerText;
    var input = document.getElementById("input_subjectName")
    input.value = value

    if (input.value.match(/^Sonderseite: /)){
      input.disabled = "true"
      input.title = "Namen von Sonderseiten können nicht editiert werden."
    } else {
      input.disabled = ""
      input.title = ""
    }
  }

  // Enable and disable the move-subject-buttons.
  enableDisableMoveSubjectButtons()
};


function updateSubjectNameInList(e){
  var list = document.getElementById("list_subjects");
  var index = list.selectedIndex;
  var opt = document.createElement("option");
  opt.value = index.toString()
  opt.text = e.value;
  list.remove(index);
  list.add(opt, index);
  list.selectedIndex = index
};


function reenableSpecialSubject(name){
  var specialSubjects = document.getElementById("specialPageSelector").options
  for (s = 0; s < specialSubjects.length; s++){
    if (specialSubjects[s].value == name.replace("Sonderseite: ", "")){
      specialSubjects[s].title = ""
      specialSubjects[s].disabled = ""
      break
    }
  }
}


function deleteSubjectFromList_key(e){
  if (event.key == "Delete" && e.length > 1){
    var list = e;
    var index = list.selectedIndex;

    // Reenable the deleted subject in the special subject list, if the deleted is a special one.
    if (list[index].innerText.match(/^Sonderseite: /)){
      reenableSpecialSubject(list.options[index].innerText)
    }

    list.remove(index);
    list.selectedIndex = Math.min(index, list.length - 1);
    document.getElementById("input_subjectName").value = list.options[list.selectedIndex].innerText;
    
    for (var i = list.selectedIndex; i <= list.length - 1; i++){
      list.options[i].value = i.toString()
    }
    
    // Delete the selected subject from all pupils.
    for (var p = 0; p < SESSION.length; p++){
      SESSION[p].subjects[index] = null
      for (var i = index; i < SESSION[p].subjects.length - 1; i++){
        SESSION[p].subjects[i] = SESSION[p].subjects[i + 1]
      }
      SESSION[p].subjects.length = SESSION[p].subjects.length - 1
    }

    // Disable the delete button, if the list has only one entry.
    if (list.length == 1){
      document.getElementById("button_deleteSubject").disabled = true
    }

    updateSubjectPanel()

    // Enable and disable the move-subject-buttons.
    enableDisableMoveSubjectButtons()
  }
};


function deleteSubjectFromList_button(e){
  var list = document.getElementById("list_subjects");
  var index = list.selectedIndex;
  
  // Reenable the deleted subject in the special subject list, if the deleted is a special one.
  if (list[index].innerText.match(/^Sonderseite: /)){
    reenableSpecialSubject(list.options[index].innerText)
  }
   
  list.remove(index);
  list.selectedIndex = Math.min(index, list.length - 1);
  document.getElementById("input_subjectName").value = list.options[list.selectedIndex].innerText;

  for (var i = index; i <= list.length - 1; i++){
    list.options[i].value = i.toString()
  }
  document.getElementById("input_subjectName").value = list.options[list.selectedIndex].innerText;
  
  // Delete the selected subject from all pupils.
  for (var p = 0; p < SESSION.length; p++){
    SESSION[p].subjects[index] = null
    for (var i = index; i < SESSION[p].subjects.length - 1; i++){
      SESSION[p].subjects[i] = SESSION[p].subjects[i + 1]
    }
    SESSION[p].subjects.length = SESSION[p].subjects.length - 1
  }
  
  // Disable the delete button, if the list has only one entry.
  if (list.length == 1){
    document.getElementById("button_deleteSubject").disabled = true
  }

  updateSubjectPanel()

  // Enable and disable the move-subject-buttons.
  enableDisableMoveSubjectButtons()
};


function changeSubjectWithinInput(e){
  if (event.key == "ArrowDown"){
    var list = document.getElementById("list_subjects");
    var index = list.selectedIndex;
    list.selectedIndex = Math.min(index + 1, list.length - 1);
    document.getElementById("input_subjectName").value = list.options[list.selectedIndex].innerText
  };
  if (event.key == "ArrowUp"){
    var list = document.getElementById("list_subjects");
    var index = list.selectedIndex;
    list.selectedIndex = Math.max(index - 1, 0);
    document.getElementById("input_subjectName").value = list.options[list.selectedIndex].innerText
  }
};


function moveSubjectDown(){
  var list = document.getElementById("list_subjects");
  var index = list.selectedIndex;
  if (index < list.length - 1 && index > -1){
    list.add(list[index+1], index);
    list.options[index].value = (parseInt(list.options[index].value) - 1).toString()
    list.options[index+1].value = (parseInt(list.options[index+1].value) + 1).toString()
    list.selectedIndex = index+1

    // Move subject down in the SESSION variable.
    for (var p = 0; p < SESSION.length; p++){
      var tmp = SESSION[p].subjects[index+1]
      SESSION[p].subjects[index+1] = SESSION[p].subjects[index]
      SESSION[p].subjects[index] = tmp
    }
  }
  // Enable and disable the move-subject-buttons.
  enableDisableMoveSubjectButtons()
};


function moveSubjectUp(){
  var list = document.getElementById("list_subjects");
  var index = list.selectedIndex;
  if (index > 0){
    list.add(list[index], index-1);
    list.options[index-1].value = (parseInt(list.options[index-1].value) - 1).toString()
    list.options[index].value = (parseInt(list.options[index].value) + 1).toString()
    list.selectedIndex = index-1

    // Move subject up in the SESSION variable.
    for (var p = 0; p < SESSION.length; p++){
      var tmp = SESSION[p].subjects[index-1]
      SESSION[p].subjects[index-1] = SESSION[p].subjects[index]
      SESSION[p].subjects[index] = tmp
    }
  }
  // Enable and disable the move-subject-buttons.
  enableDisableMoveSubjectButtons()
};


function importSubjects(e){
  if (e.files.length == 0){
    return;
  };

  var reader = new FileReader();
  reader.onload = function(e){
    const file = e.target.result;

    // Only load the file into the program if it’s not larger than 1024 bytes (avoid crashing).
    if (file.length <= 1024){
      var lines = {}

      if (file.match(";")){
        lines = file.split(";");
      } else {
        lines = file.split(/\r\n|\n/);
      }

      // Delete all subjects already in the list.
      while (document.getElementById("list_subjects").length != 0){
        document.getElementById("list_subjects").remove(0)
      };

      // Delete all subjects already stored in the SESSION variable.
      for (var p = 0; p < SESSION.length; p++){
        SESSION[p].subjects = []
      }

      for (l in lines){
        // Delete double, trailing, and leading spaces.
        lines[l] = lines[l].replace(/[ ]{2,}/, " ").replace(/ *$/, "").replace(/^ */, "");
        if (lines[l] != ""){
          addSubject(lines[l]);
        }
      }

      if (document.getElementById("list_subjects").length > 0){
        document.getElementById("list_subjects").selectedIndex = 0
        document.getElementById("input_subjectName").value = document.getElementById("list_subjects")[0].innerText
        updateSubjectPanel()
      }

      // Enable and disable the move-subject-buttons.
      enableDisableMoveSubjectButtons()
    } else {
      window.alert("Die gewählte Datei scheint zu groß für eine Fächerliste (> 1024 Byte). Bitte prüfen.")
    }
  };

  reader.onerror = function(e){
    alert(e.target.error.name);
  }
  reader.readAsText(e.files[0]);
};


function exportSubjectsList(){
  var s = ""
  var list = document.getElementById("list_subjects")

  for (i = 0; i < list.length; i++){
    if (list.options[i].innerText){
      s = s + list.options[i].innerText + ";"
    }
  }

  document.getElementById("exportSubjectsList_prompt").href = 'data:text/plain;charset=utf-8,' + s
  
  // Click the invisible download button to prompt the user to save the file.
  document.getElementById("exportSubjectsList_prompt").click()
}


function applySubjectContentsToAll(){
  var pIndex = getSelectedPupil().index
  var sIndex = getSelectedSubject().index
  for (var p = 0; p < SESSION.length; p++){
    SESSION[p].subjects[sIndex].contents = SESSION[pIndex].subjects[sIndex].contents
  }
  
  var b = document.getElementById("button_applySubjectContentsToAll")
  var t = b.innerText
  b.innerText = "Inhalte wurden übertragen!"
  setTimeout(function(){
    b.innerText = t
  }, 2000)
}


function applyTeacherToAll(){
  var pIndex = getSelectedPupil().index
  var sIndex = getSelectedSubject().index
  for (var p = 0; p < SESSION.length; p++){
    SESSION[p].subjects[sIndex].teacher = SESSION[pIndex].subjects[sIndex].teacher
  }

  var b = document.getElementById("button_applyTeacherToAll")
  var t = b.innerText
  b.innerText = "Lehrer wurde übertragen!"
  setTimeout(function(){
    b.innerText = t
  }, 2000)
}


function applyKlassenspielContentsToAll(){
  var pIndex = getSelectedPupil().index
  var sIndex = getSelectedSubject().index
  for (var p = 0; p < SESSION.length; p++){
    SESSION[p].subjects[sIndex].contents = SESSION[pIndex].subjects[sIndex].contents
  }
  
  var b = document.getElementById("button_applyKlassenspielContentsToAll")
  var t = b.innerText
  b.innerText = "Inhalte wurden übertragen!"
  setTimeout(function(){
    b.innerText = t
  }, 2000)
}


function updateSubjectPanel(){
  var p = getSelectedPupil()
  var s = getSelectedSubject()

  var sPages = document.getElementsByClassName("subjectInfoPage")

  for (i = 0; i < sPages.length; i++){
    console.log("Setting " + sPages[i].id + " invisible")
    sPages[i].style = "display: none"
  }
  
  if (s.name.match(/^Sonderseite:/)){
    if (s.name.match("Eurythmie")){
      document.getElementById("eurythmieabschlussPage").style = "display: block"
      console.log("Eurythmie aktiv!")
      var t = document.getElementById("eurythmieTable")

      // Delete all eurythmie rows but the header.
      while (t.rows.length > 1){
        t.deleteRow(1)
      }

      // If the pupil has no eurythmie works yet, create an empty array for him.
      if (! SESSION[p.index].subjects[s.index].works){
        SESSION[p.index].subjects[s.index].works = []
      }

      console.log("Works: " + SESSION[p.index].subjects[s.index].works.length)
      for (w in SESSION[p.index].subjects[s.index].works){
        console.log("Checking pupil eurythmie work " + w + " of " + SESSION[p.index].subjects[s.index].works.length)
        console.log("Rows: " + t.rows.length)
        console.log(t)
        if (! t.rows[w+1]){
          addEurythmieRow_GUI()
        }
        t.rows[t.rows.length-1].cells[1].children[0].value = SESSION[p.index].subjects[s.index].works[w].author || ""
        t.rows[t.rows.length-1].cells[2].children[0].value = SESSION[p.index].subjects[s.index].works[w].work || ""
        console.log("Adding " + SESSION[p.index].subjects[s.index].works[w].author + " and " + SESSION[p.index].subjects[s.index].works[w].work)            
      }
      
      while (t.rows.length > SESSION[p.index].subjects[s.index].works.length + 1 && t.rows.length > 2){
        t.deleteRow(t.rows.length - 1)
        console.log("Deleting excess row " + t.rows.length)
      }

      if (t.rows.length == 2){
        t.rows[1].cells[0].children[0].disabled = true
      }
      
      if (t.rows.length == 1){
        addEurythmieRow_GUI()
        addEurythmieRow_session()
      }

      document.getElementById("textarea_finalEurythmy_evaluation").value = SESSION[p.index].subjects[s.index].evaluation || ""
    }

    if (s.name.match("Jahresarbeit")){
      document.getElementById("jahresarbeitPage").style = "display: block"

      document.getElementById("input_jahresarbeit_firstReader").value = SESSION[p.index].subjects[s.index].firstReader || ""
      document.getElementById("input_jahresarbeit_secondReader").value = SESSION[p.index].subjects[s.index].secondReader || ""
      document.getElementById("input_jahresarbeit_topic").value = SESSION[p.index].subjects[s.index].topic || ""
      document.getElementById("textarea_jahresarbeit_evaluation").value = SESSION[p.index].subjects[s.index].evaluation || ""
    }

    if (s.name.match("Klassenspiel")){
      document.getElementById("klassenspielPage").style = "display: block"

      document.getElementById("textarea_klassenspiel_contents").value = SESSION[p.index].subjects[s.index].contents || ""
      document.getElementById("textarea_klassenspiel_evaluation").value = SESSION[p.index].subjects[s.index].evaluation || ""
      document.getElementById("heading_klassenspiel_evaluation").innerText = "Bewertung für " + SESSION[p.index].firstName.match(/^[^ ]*/)
    }

  } else {
    document.getElementById("defaultPage").style = "display: block"
    
    var heading1 = document.getElementById("heading_subjectContents");
    var heading2 = document.getElementById("heading_evaluation");
            
    heading1.innerText = "Inhalte im Fach " + s.name + ":";
    heading2.innerText = "Bewertung für " + p.firstName.match(/^[^ ]*/) + ":"

    document.getElementById("input_teacher").value = SESSION[p.index].subjects[s.index].teacher || ""
    document.getElementById("input_mark").value = SESSION[p.index].subjects[s.index].mark || ""
    document.getElementById("textarea_subjectContents").value = SESSION[p.index].subjects[s.index].contents || ""
    document.getElementById("textarea_evaluation").value = SESSION[p.index].subjects[s.index].evaluation || ""
  }
}


function addEurythmieRow_GUI(){
  var t = document.getElementById("eurythmieTable")

  var lastListIndex = document.getElementsByClassName("eurythmieRow").length;
  var newRow = document.createElement('TR');
  newRow.classList.add("eurythmieRow");
  newRow.innerHTML = '<tr class="eurythmieRow"><td align=right><button type="button" title="Werk löschen" onclick="deleteEurythmieRow(this)">Löschen</td><td><input type="text" class="input_eurythmieRow" onchange="deleteExcessSpaces(this)" oninput="updateSession_eurythmieRow_author(this)"></td><td><input type="text" class="input_eurythmieRow" onchange="deleteExcessSpaces(this)" oninput="updateSession_eurythmieRow_work(this)"></td></tr>'
  newRow.setAttribute("data-index", lastListIndex)
  t.getElementsByTagName("tbody")[0].appendChild(newRow);

  if (lastListIndex > 0){
    t.rows[1].cells[0].children[0].disabled = ""
  } else {
    t.rows[1].cells[0].children[0].disabled = "true"
  }
}


function addEurythmieRow_session(){
  var p = getSelectedPupil()
  var s = getSelectedSubject()

  var w = SESSION[p.index].subjects[s.index].works

  w[w.length] = {"author": "", "work": ""}
}


function deleteEurythmieRow(e, i){
  var p = getSelectedPupil()
  var s = getSelectedSubject()
  var index = parseInt(e.parentNode.parentNode.dataset.index)
  if (i){
    index = i
  }
  var t = document.getElementById("eurythmieTable")
  
  t.deleteRow(index + 1)
  for (i = index; i < t.rows.length; i++){
    t.rows[i].setAttribute("data-index", (i-1).toString())
    SESSION[p.index].subjects[s.index].works[i] = SESSION[p.index].subjects[s.index].works[i+1]
  }
  SESSION[p.index].subjects[s.index].works.length -= 1      

  if (t.rows.length == 2){
    t.rows[1].cells[0].children[0].disabled = true
  }

  
}


function checkTypography(e){
  // Change the text while typing.
  var text = e.value
  if (text.match(/„[^“]*$/) && text.match(/"$/)){
    text = text.replace(/"$/, '“')
  }
  if (!text.match('„') && text.match(/"$/)){
    text = text.replace(/"$/, '„')
  }
  if (text.match(/ -$/)){
    text = text.replace(/-$/, '–')
  }
  if (text.match(/'$/)){
    text = text.replace(/'$/, '’')
  }

  // Changes pasted text.
  // Second condition prevents potential infinity loop.
  var i = 0
  while (text.match(/"/g) && i < text.length){
    if (i % 2 == 0){
      text = text.replace('"', "„")
    } else {
      text = text.replace('"', "“")
    }
    i++
  }

  while (text.match(/ - /g)){
    text = text.replace(' - ', " – ")
  }

  e.value = text
}


function updateFinalRemarksPanel(){
  console.log("Updating final remarks page.")
  var p = getSelectedPupil()
  var i = p.index
  var name = p.firstName.match(/^[^ ]*/)
  document.getElementById("input_daysAbsent").value = SESSION[i].daysAbsent || ""
  document.getElementById("input_daysAbsent_unexplained").value = SESSION[i].daysAbsent_unexplained || ""
  document.getElementById("heading_finalRemarks").innerText = "Bemerkungen für " + name + ":"
  document.getElementById("textarea_finalRemarks").value = SESSION[i].finalRemarks || ""
}


function sortPupilsTableByFirstName(e){
  var pupils = document.getElementsByClassName("pupilRow")
  
  if (e.dataset.order == "none"){
    SESSION.sort(function(a, b){
      if (a.firstName < b.firstName){
        return -1
      }
      if (a.firstName > b.firstName){
        return 1
      }
      return 0
    });
  }

  if (e.dataset.order == "asc" || e.dataset.order == "desc"){
    for (i = 0; i < (SESSION.length - 1) / 2; i++){
      var tmp = SESSION[i]
      SESSION[i] = SESSION[SESSION.length - 1 - i]
      SESSION[SESSION.length - 1 - i] = tmp
    }
  }

  for (i = 0; i < SESSION.length; i++){
    pupils[i].children[1].children[0].checked = SESSION[i].print || ""
    pupils[i].children[3].children[0].value = SESSION[i].firstName
    pupils[i].children[4].children[0].value = SESSION[i].lastName
  }

  if (e.dataset.order == "none" || e.dataset.order == "desc"){
    e.setAttribute('data-order', "asc")
    e.innerText = "Vorname ⏶"
  } else {
    e.setAttribute('data-order', "desc")
    e.innerText = "Vorname ⏷"
  }      

  document.getElementById("t01").rows[0].cells[4].children[0].innerText = "Nachname •"
  document.getElementById("t01").rows[0].cells[4].children[0].setAttribute("data-order", "none")

  updateSubjectPanel()
  updateFinalRemarksPanel()
}


function sortPupilsTableByLastName(e){
  var pupils = document.getElementsByClassName("pupilRow")

  if (e.dataset.order == "none"){
    SESSION.sort(function(a, b){
      if (a.lastName < b.lastName){
        return -1
      }
      if (a.lastName > b.lastName){
        return 1
      }
      return 0
    });
  }

  if (e.dataset.order == "asc" || e.dataset.order == "desc"){
    for (i = 0; i < (SESSION.length - 1) / 2; i++){
      var tmp = SESSION[i]
      SESSION[i] = SESSION[SESSION.length - 1 - i]
      SESSION[SESSION.length - 1 - i] = tmp
    }
  }

  for (i = 0; i < SESSION.length; i++){
    pupils[i].children[1].children[0].checked = SESSION[i].print || ""
    pupils[i].children[3].children[0].value = SESSION[i].firstName
    pupils[i].children[4].children[0].value = SESSION[i].lastName
  }

  if (e.dataset.order == "none" || e.dataset.order == "desc"){
    e.setAttribute('data-order', "asc")
    e.innerText = "Nachname ⏶"
  } else {
    e.setAttribute('data-order', "desc")
    e.innerText = "Nachname ⏷"
  }

  document.getElementById("t01").rows[0].cells[3].children[0].innerText = "Vorname •"
  document.getElementById("t01").rows[0].cells[3].children[0].setAttribute("data-order", "none")

  updateSubjectPanel()
  updateFinalRemarksPanel()
}


/************
* Calendar. *
************/

function overlay_calendar_toggle(e){
  if (! e.disabled){
    document.getElementById('overlay_calendar').style.visibility = "visible"
    document.getElementById('overlay_calendar').style.opacity = 1
    console.log("Calendar visible.")
    e.disabled = true
  } else {
    document.getElementById('overlay_calendar').style.visibility = "hidden"
    document.getElementById('overlay_calendar').style.opacity = 0
    e.disabled = ""
  }

  if (document.getElementById('calendarSheet').rows.length == 0){
    overlay_calendar_populate()
  }

  var pos = document.getElementById('input_date').getBoundingClientRect();
  document.getElementById('overlay_calendar').style.left = pos.x - 0.5 * document.getElementById('overlay_calendar').offsetWidth + 0.5 * pos.width + "px"
  document.getElementById('overlay_calendar').style.top = pos.y + pos.height + "px";
}


function getNumberFromMonth(name){
  for (m = 0; m < monthNames.length; m++){
    if (monthNames[m] == name){
      return m + 1
    }
  }
}


function overlay_calendar_populate(){
  var year = document.getElementById("overlay_calendar_year").innerText
  var month = getNumberFromMonth(document.getElementById("overlay_calendar_month").innerText) // 1–12

  var firstWeek = getWeekNumber(year + month.toString().padStart(2, '0') + "01")
  // Generate the new table.
  var t = document.createElement('table')
  
  // Generate the rows for the current month.
  var r = document.createElement('TR')
  var c = document.createElement('TD')
  c.classList.add('calendar_weeknumber')
  r.append(c)

  // Calendar header.
  weekdayNames.forEach(function(v){
    var c = document.createElement('TD')
    c.classList.add('calendar_weekday')
    c.innerText = v
    r.append(c)
  })
  t.append(r)
  
  r = document.createElement('TR')
  r.classList.add('row_week')
  c = document.createElement('TD')

  // Fill the calendar sheet with blank days for the weekdays of the previous month.
  var tmp = new Date(year, month - 1, 1)
  var firstOfMonth_weekday = (tmp.getDay() + 6) % 7
  // Add the week number to the calendar sheet, if the weekday is not monday.
  if (firstOfMonth_weekday > 0){
    c.innerText = firstWeek
    c.classList.add('calendar_weeknumber')
    r.appendChild(c)
  }
  for (w = 0; w < firstOfMonth_weekday; w++){
    c = document.createElement('TD')
    r.appendChild(c)
  }

  var checkingDate = new Date(year, month - 1, 1)
  var d = 1
  while (checkingDate.getMonth() == month - 1){
    // If it’s monday again, append the current row to the table and create a new one.
    if ((checkingDate.getDay() + 6) % 7 == 0){
      // This condition prevents appending an empty row.
      if (d > 1){
        t.append(r)
      }
      r = document.createElement('TR')
      r.classList.add('row_week')
      c = document.createElement('TD')
      c.innerText = getWeekNumber(checkingDate.getFullYear() + (checkingDate.getMonth() + 1).toString().padStart(2, "0") + d.toString().padStart(2, "0"))
      c.classList.add('calendar_weeknumber')
      r.appendChild(c)
    }
    c = document.createElement('TD')
    c.innerHTML = '<button type="button" class="calendar_dateButton" onclick="overlay_calendar_confirmDate(this)">' + checkingDate.getDate() + '</button>'
    r.appendChild(c)
    d = d + 1
    checkingDate = new Date(year, month - 1, d)        
  }
  // Finally, append the latest row.
  t.append(r)

  while (t.rows.length < 7){
    r = document.createElement('TR')
    r.classList.add('row_week')
    c = document.createElement('TD')
    c.classList.add('calendar_weeknumber')
    c.innerHTML = '<span style="color: transparent">X</span>'
    r.append(c)
    t.append(r)
  }

  document.getElementById("calendarSheet").innerHTML = t.innerHTML
}


function overlay_calendar_close(e){
  if (!e){
    e = document.getElementById("button_closeCalendar")
  }
  e.parentNode.style.opacity = 0
  setTimeout(function(){
    document.getElementById("overlay_calendar").style.visibility = "hidden";
    document.getElementById("input_date").disabled = ""
  },
    500
  )
}


function overlay_calendar_confirmDate(e){
  var day = e.innerText.padStart(2, "0")
  var month = getNumberFromMonth(document.getElementById("overlay_calendar_month").innerText).toString().padStart(2, "0")
  var year = document.getElementById("overlay_calendar_year").innerText
  document.getElementById("input_date").value = day + "." + month + "." + year

  document.getElementById("label_year").innerText = (parseInt(year) - 1).toString() + "/" + year.match(/[0-9]{2}$/)

  SESSION.date = document.getElementById("input_date").value
  SESSION.year = document.getElementById("label_year").innerText
  
  overlay_calendar_close()
}


function overlay_calendar_decreaseYear(e){
  var year = parseInt(e.parentNode.parentNode.parentNode.rows[0].cells[1].innerText)
  e.parentNode.parentNode.parentNode.rows[0].cells[1].innerText = (year - 1).toString()
  overlay_calendar_populate()
}


function overlay_calendar_increaseYear(e){
  var year = parseInt(e.parentNode.parentNode.parentNode.rows[0].cells[1].innerText)
  e.parentNode.parentNode.parentNode.rows[0].cells[1].innerText = (year + 1).toString()
  overlay_calendar_populate()
}


function overlay_calendar_decreaseMonth(e){
  for (m = 0; m < monthNames.length; m++){
    if (monthNames[m] == document.getElementById("overlay_calendar_month").innerText){
      if (m == 0){
        var year = parseInt(document.getElementById("overlay_calendar_year").innerText)
        document.getElementById("overlay_calendar_year").innerText = (year - 1).toString()
      }
      document.getElementById("overlay_calendar_month").innerText = monthNames[(m - 1 + 12) % 12]
      break
    }
  }
  overlay_calendar_populate()
}


function overlay_calendar_increaseMonth(e){
  for (m = 0; m < monthNames.length; m++){
    if (monthNames[m] == document.getElementById("overlay_calendar_month").innerText){
      if (m == 11){
        var year = parseInt(document.getElementById("overlay_calendar_year").innerText)
        document.getElementById("overlay_calendar_year").innerText = (year + 1).toString()
      }
      document.getElementById("overlay_calendar_month").innerText = monthNames[(m + 1) % 12]
      break
    }
  }
  overlay_calendar_populate()
}



/**********************************
* Certificate generation overlay. *
**********************************/


function overlay_certGeneration_open(){
  console.log("Öffne Zeugniserstellungsdialog.")
  document.getElementById("overlay_background").style.visibility = "visible"
  document.getElementById("overlay_background").style.opacity = 0.5
  document.getElementById("overlay_certGeneration").style.visibility = "visible"
  document.getElementById("overlay_certGeneration").style.opacity = 1
}


function overlay_certGeneration_close(e){
  e.parentNode.parentNode.style.opacity = 0
  document.getElementById("overlay_background").style.opacity = 0;
  setTimeout(function(){
    e.parentNode.parentNode.style.visibility = "hidden";
    document.getElementById("overlay_background").style.visibility = "hidden";

    // Reset the dialog when closing it.
    document.getElementById("overlay_certGeneration_explaination").style.visibility = "hidden"
    document.getElementById("overlay_certGeneration_button_generate").style.visibility = "hidden"
    document.getElementById("overlay_certGeneration_explaination").style.opacity = 0
    document.getElementById("overlay_certGeneration_button_generate").style.opacity = 0
    document.getElementById("overlay_certGeneration").style.height = document.getElementById("overlay_certGeneration").dataset.heightSmall
    document.getElementById("input_path_sessionFile").value = ""
  },
    500
  )
}


function overlay_mergeImport_close(e){
  var canvas = ""
  if (e){
    canvas = e.parentNode.parentNode
  } else {
    canvas = document.getElementById("overlay_infocanvas")
  }
  canvas.style.opacity = 0
  document.getElementById("overlay_background").style.opacity = 0
  setTimeout(function(){
    canvas.style.visibility = "hidden"
    document.getElementById("overlay_background").style.visibility = "hidden"
  }, 750)
}


function fillSessionFileInput(e){
  e.parentNode.parentNode.cells[0].children[0].value = e.files[0].name
  document.getElementById("overlay_certGeneration").style.height = document.getElementById("overlay_certGeneration").dataset.heightFull + "px"
  document.getElementById("overlay_certGeneration").style.top = 0.5 * window.innerHeight - 0.5 * document.getElementById("overlay_certGeneration").dataset.heightFull + "px"
  setTimeout(function(){
    document.getElementById("overlay_certGeneration_explaination").style.visibility = "visible"
    document.getElementById("overlay_certGeneration_button_generate").style.visibility = "visible"
    document.getElementById("overlay_certGeneration_explaination").style.opacity = 1
    document.getElementById("overlay_certGeneration_button_generate").style.opacity = 1
  },
    1000
  )
}


function generateCertGenerationFile(e){
  const sessionFileName = document.getElementById("input_path_sessionFile").value
  var scriptContent_Unix = '%23!/usr/bin/env bash%0A%0Acd "$(dirname "$0")"%0A%0AsessionFile="' + sessionFileName + '"%0A%0Axterm -e "$(pwd)/../data_backend/ulua/lua" "$(pwd)/../data_backend/schoolCert.lua" "$sessionFile" 2>./errors_main.txt'
  var scriptContent_Win = 'chcp 1252%0A%0Acd "%25~dp0/"%0A%0Aset sessionFile="' + sessionFileName + '"%0A%0A"%25cd%25/../data_backend/ulua/lua.cmd" "%25cd%25/../data_backend/schoolCert.lua" %25sessionFile%25 2>%25cd%25/errors_main.txt'

  console.log(scriptContent_Unix)
  console.log(scriptContent_Win)

  if (OS.match("Windows")){
    document.getElementById("saveCertsGenerationFile_prompt").href = 'data:text/plain;charset=utf-8,' + scriptContent_Win
    document.getElementById("saveCertsGenerationFile_prompt").download = sessionFileName.replace(/.txt$/, "") + ", Zeugnisse.bat"
  } else {
    document.getElementById("saveCertsGenerationFile_prompt").href = 'data:text/plain;charset=utf-8,' + scriptContent_Unix
    document.getElementById("saveCertsGenerationFile_prompt").download = sessionFileName.replace(/.txt$/, "") + ", Zeugnisse.sh"
    console.log(document.getElementById("saveCertsGenerationFile_prompt").href)
  }

  document.getElementById("saveCertsGenerationFile_prompt").click()
}



// Adjust some element properties when starting the GUI.

document.getElementById("overlay_certGeneration").dataset.heightFull = document.getElementById("overlay_certGeneration").offsetHeight
document.getElementById("overlay_certGeneration_explaination").style.display = "none"
document.getElementById("overlay_certGeneration_button_generate").style.display = "none"
document.getElementById("overlay_certGeneration").style.height = document.getElementById("overlay_certGeneration").offsetHeight + "px"
document.getElementById("overlay_certGeneration").dataset.heightSmall = document.getElementById("overlay_certGeneration").style.height + "px"
document.getElementById("overlay_certGeneration_explaination").style.display = "block"
document.getElementById("overlay_certGeneration_button_generate").style.display = "block"

document.getElementById("overlay_certGeneration_explaination").style.opacity = 0
document.getElementById("overlay_certGeneration_button_generate").style.opacity = 0
document.getElementById("overlay_certGeneration_explaination").style.visibility = "hidden"
document.getElementById("overlay_certGeneration_button_generate").style.visibility = "hidden"

document.getElementById("list_subjects").style += "; height: calc(" + window.innerHeight + "px - 380px)";
document.getElementById("pupilTableWrapper").style += "; height: calc(" + window.innerHeight + "px - 380px)"

document.getElementById("overlay_background").style.height = window.innerHeight + "px"
document.getElementById("overlay_background").style.width = window.innerWidth + "px"

document.getElementById("overlay_infocanvas").style.width = 1 * document.getElementById("overlay_infocanvas").offsetWidth + "px"
document.getElementById("overlay_infocanvas").style.top = 0.5 * window.innerHeight - 0.5 * document.getElementById("overlay_infocanvas").offsetHeight + "px"
document.getElementById("overlay_infocanvas").style.left = 0.5 * window.innerWidth - 0.5 * document.getElementById("overlay_infocanvas").style.width.match(/[0-9]*/) + "px"

document.getElementById("overlay_certGeneration").style.width = 1 * document.getElementById("overlay_certGeneration").offsetWidth + "px"
document.getElementById("overlay_certGeneration").style.top = 0.5 * window.innerHeight - 0.5 * document.getElementById("overlay_certGeneration").offsetHeight + "px"
document.getElementById("overlay_certGeneration").style.left = 0.5 * window.innerWidth - 0.5 * document.getElementById("overlay_certGeneration").style.width.match(/[0-9]*/) + "px"
