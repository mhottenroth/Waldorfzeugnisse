const fs = require("fs")
const path = require('path')


/**********************
* Debugging funtions. *
**********************/

document.addEventListener("keypress", function(e){
  if (e.key == "#"){
    console.log(SESSION);
  }
  if (e.key == "~"){
    console.log(JSON.stringify(SESSION, null, "  "))
  }
});



/********************************************************
* Initiate the session and set some element attributes. *
********************************************************/

// Provide a JSON format compatible session variable/dataset.
var SESSION = [{}]
var SESSIONS_imported = []

var monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
var weekdayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


window.addEventListener('load', 
  () => {
    // Clear all textareas.
    let textareas = document.getElementsByTagName("textarea")
    for (t in textareas){
      textareas[t].value = ""
    }
    
    
    // Clear all inputs.
    let inputs = document.getElementsByTagName("input")
    for (i in inputs){
      inputs[i].value = ""
    }
    
    
    // Populate the session variable/dataset with inital data.
    SESSION[0].class = "Platzhalter"
    SESSION[0].year = ""
    SESSION[0].date = ""
    SESSION[0].place = "Leipzig"
    SESSION[0].pupils = []

    
    // Adding some generic initial data.
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
    
    
    // Fill some forms initially.
    let d = new Date();
    let l = document.getElementById("label_year");
    
    l.innerText = ((d.getFullYear() - 1).toString() + "/" + (d.getFullYear().toString()).match(/\d\d$/));
    SESSION[0].year = l.innerText
    document.getElementById("overlay_calendar_year").innerText = d.getFullYear()
    
    
    document.getElementById("input_date").value = (d.getDate().toString().padStart(2, '0') + "." + (d.getMonth() + 1).toString().padStart(2, '0') + "." + d.getFullYear().toString());
    
    SESSION[0].date = document.getElementById("input_date").value
    document.getElementById("overlay_calendar_month").innerText = monthNames[d.getMonth()]
    
    document.getElementById("input_class").value = SESSION[0].class
    document.getElementById("input_place").value = SESSION[0].place
    
    document.getElementById("sessionFilesName_input").value = "${Klasse}, ${SJahr}, ${Jahr}.${Monat}.${Tag}"
    updateNamePreviewLabel(document.getElementById("sessionFilesName_input"))
    
    document.getElementById("overlay_background").style.height = window.innerHeight + "px"
    document.getElementById("overlay_background").style.width = window.innerWidth + "px"
    
    document.getElementById("overlay_infocanvas").style.width = 1 * document.getElementById("overlay_infocanvas").offsetWidth + "px"
    document.getElementById("overlay_infocanvas").style.top = 0.5 * window.innerHeight - 0.5 * document.getElementById("overlay_infocanvas").offsetHeight + "px"
    document.getElementById("overlay_infocanvas").style.left = 0.5 * window.innerWidth - 0.5 * document.getElementById("overlay_infocanvas").style.width.match(/[0-9]*/) + "px"

    let mainTableTabs = document.getElementsByClassName("button_tab")
    let mainTableNotebooks = document.getElementById("mainTable").children
    for (var i = 0; i < mainTableTabs.length; i++){
      if (i < mainTableNotebooks.length){
        let buttonLabel = mainTableTabs[i].innerText
        mainTableNotebooks[i].id = buttonLabel
        // Show the first tab page and render the others invisible.
        if (i > 0){
          mainTableNotebooks[i].style.display = "none"
        }
      }
    }
    toggleMainTableTabs(mainTableNotebooks[0])
  }
)


/**********************************
* Header information (meta data). *
**********************************/

function updatePlace(e){
  document.getElementById("place").innerText = e.value.toUpperCase()
  SESSION[0].place = e.value
}


function updateNamePreviewLabel(e){
  // Replacement preparation for ${Jahr}, ${Monat}, ${Tag}, and ${SJahr}.
  let Jahr = SESSION[0].date.match(/[0-9]{4}$/)
  let Monat = SESSION[0].date.match(/[0-9]{2}\.([0-9]{2})/)[1]
  let Tag = SESSION[0].date.match(/^[0-9]{2}/)
  let SJahr = SESSION[0].year.replace("/", "-")
  
  // Replacement preparation for ${Klasse}.
  let Klasse = SESSION[0].class

  let replacedText = e.value.replace("${Klasse}", Klasse).replace("${SJahr}", SJahr).replace("${Jahr}", Jahr).replace("${Monat}", Monat).replace("${Tag}", Tag)
  document.getElementById("sessionFilesName_namePreviewLabel").innerText = replacedText + ".json"
}


/***************************
* Main table tabs control. *
***************************/

function toggleMainTableTabs(e){
  if (e.ariaPressed == "false"){
    let tabButtons = document.getElementsByClassName("button_tab")
    let mainTableNotebooks = document.getElementById("mainTable").children
    for (let b = 0; b < tabButtons.length; b++){
      tabButtons[b].ariaPressed = "false"
      mainTableNotebooks[b].style.display = "none"
    }
    e.ariaPressed = "true"
    document.getElementById(e.innerText).style.display = "unset"
  }

  let needingHeightStretch = document.getElementsByClassName("needsHeightStretch")
  for (i = 0; i < needingHeightStretch.length; i++){
    stretchHeightToScreen(needingHeightStretch[i])
  }
}


/***************************************************
* General functions (non-input-element callbacks). *
***************************************************/

function getWeekNumber(datestring){
  // datestring is ISO-formatted (YYYYMMDD).
  let year = parseInt(datestring.match(/(^[0-9]{4})/)[1])
  let month = parseInt(datestring.match(/^[0-9]{4}([0-9]{2})/)[1])
  let day = parseInt(datestring.match(/^[0-9]{4}[0-9]{2}([0-9]{2})/)[1])

  let d = new Date(year, month - 1, day)

  let firstOfYear = new Date(year, 0, 1)
  // Default: Sun = 0, Mon = 1 etc. Next line performs a shift: Sun = 6; Mon = 0 etc.
  let firstOfYear_weekday = (firstOfYear.getDay() + 6) % 7

  // Add half a day (0.5 * 1000 * 3600 * 24) to compensate summer time.
  let week = Math.ceil(( d.valueOf() + 0.5 * 1000 * 3600 * 24 - firstOfYear.valueOf() + firstOfYear_weekday * 1000 * 3600 * 24 ) / 1000 / 3600 / 24 / 7)

  // Week number calculation based on ISO 8601 (first calendar week is the one with the first Thursday in January).
  if (firstOfYear_weekday > 3){
    week -= 1
    if (week == 0){
      // In case of week == 0, the shown week number equals the one of December 31st (»1231«) of the previous year.
      week = getWeekNumber((year-1).toString() + '1231')
    }
  }
  return week
}


function stretchHeightToScreen(element){
  let element_rect = element.getBoundingClientRect()
  element.style += "; height: calc(" + window.innerHeight + "px - " + element_rect.top + "px - 2em - 3px)"
}


// Delete leading and trailing spaces and reduce multiple consecutive spaces to one.
function deleteExcessSpaces(e){
  e.value = e.value.replace(/^ */g, "").replace(/ {2,}/g, " ").replace(/ *$/g, "")
}


// For correct quotation marks and dashes.
function checkSyntax(e){
  // Change the text while typing.
  let text = e.value
  if (text.match(/„[^“]*$/) && text.match(/"$/)){
    text = text.replace(/"$/, '“')
  }
  if (text.match(/“[^„]+"$/)){
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
  let i = 0
  while (text.match('"') && i < text.length){
    if (i % 2 == 0){
      text = text.replace(/^[^"]*"/, "$1„")
    } else {
      text = text.replace(/^[^"]*"/, "$1“")
    }
    i++
  }

  text = text.replace(/ - /g, " – ")

  e.value = text
}


// Some text areas are not allowed to contain blank lines.
function deleteLineFeeds(e){
  e.value = e.value.replace(/\n$/, '')
}



/*******************
* Pupil functions. *
*******************/


function addSubjectToAllPupils(name){
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    let i = document.getElementById("list_subjects").options.length - 1
    SESSION[0].pupils[p].subjects[i] = {
      "name": name
    }
  }
}


function generatePupilDataset(firstName, lastName){
  let dataset = {
    "firstName": firstName || "",
    "lastName": lastName || "",
    "daysAbsent": "",
    "daysAbsent_unexplained": "",
    "daysAbsent_print": true,
    "finalRemarks": "",
    "print": true,
    "subjects": []
  }

  let subjects = document.getElementById("list_subjects").options
  for (let s = 0; s < subjects.length; s++){
    dataset.subjects[s] = {
      "name": subjects[s].innerText
    }
  }
  return dataset
}    


function getSelectedPupil(){
  let radio_pupils = document.getElementsByName("radio_pupil")
  let index
  for (i in radio_pupils){
    if (radio_pupils[i].checked){
      index = i
      break
    }
  }

  let pupils = document.getElementsByClassName("pupilRow")
  let fn = pupils[index].cells[3].children[0].value
  let ln = pupils[index].cells[4].children[0].value

  return {"firstName": fn, "lastName": ln, "index": index}
}


function neutralizePupilSorting(category){
  if (category == "firstName"){
    document.getElementById("pupilsTable_firstName").innerText = "Vorname ◉"
    document.getElementById("pupilsTable_firstName").setAttribute("data-order", "none")
  } else if (category == "lastName"){
    document.getElementById("pupilsTable_lastName").innerText = "Nachname ◉"
    document.getElementById("pupilsTable_lastName").setAttribute("data-order", "none")
  }
}


function sortPupilsTable(e, category){
  // Valid category values: firstName, lastName.
  let pupils = document.getElementsByClassName("pupilRow")

  if (e.dataset.order == "none"){
    SESSION[0].pupils.sort(function(a, b){
      if (a[category] < b[category]){
        return -1
      }
      if (a[category] > b[category]){
        return 1
      }
      return 0
    });
  }

  if (e.dataset.order == "asc" || e.dataset.order == "desc"){
    for (let i = 0; i < (SESSION[0].pupils.length - 1) / 2; i++){
      let tmp = SESSION[0].pupils[i]
      SESSION[0].pupils[i] = SESSION[0].pupils[SESSION[0].pupils.length - 1 - i]
      SESSION[0].pupils[SESSION[0].pupils.length - 1 - i] = tmp
    }
  }

  for (let i = 0; i < SESSION[0].pupils.length; i++){
    pupils[i].children[1].children[0].checked = SESSION[0].pupils[i].print || ""
    pupils[i].children[3].children[0].value = SESSION[0].pupils[i].firstName
    pupils[i].children[4].children[0].value = SESSION[0].pupils[i].lastName
  }

  if (e.dataset.order == "none" || e.dataset.order == "desc"){
    e.setAttribute('data-order', "asc")
    e.innerText = (category == "firstName" ? "Vorname" : "Nachname") + " ▲"
  } else {
    e.setAttribute('data-order', "desc")
    e.innerText = (category == "firstName" ? "Vorname" : "Nachname") + " ▼"
  }

  neutralizePupilSorting(category == "firstName" ? "lastName" : "firstName")

  updateSubjectPanel()
  updateFinalRemarksPanel()
}


function addPupil(firstName, lastName, guionly){
  let fn = firstName || "";
  let ln = lastName || "";

  let lastListIndex = document.getElementsByClassName("pupilRow").length;
  let newRow = document.createElement('TR');
  newRow.classList.add("pupilRow");
  newRow.innerHTML = '<td align=right><button type="button" title="Schüler aus der Liste löschen" onclick="deletePupil(this); updateFinalRemarksPanel()">Löschen</td>\
    <td align=center class="checkboxCell"><input type="checkbox" name="printPupilCheckbox" checked onclick="updateSession_togglePrint(this)"></td>\
    <td align=right><span>' + (lastListIndex + 1) + '</span></td>\
    <td><input type="text" tabindex="' + ((lastListIndex + 1) * 2 - 1) + '" class="input_name" value="' + fn + '" oninput="updateSession_firstName(this); updateFinalRemarksPanel(); updateSubjectPanel()" onchange="deleteExcessSpaces(this); neutralizePupilSorting(\'firstName\')"></td>\
    <td><input type="text" tabindex="' + ((lastListIndex + 1) * 2) + '" class="input_name" value="' + ln + '" oninput="updateSession_lastName(this)" onchange="deleteExcessSpaces(this); neutralizePupilSorting(\'lastName\')"></td>\
    <td align=center class="radioCell"><input type="radio" onclick="updateSubjectPanel(); updateFinalRemarksPanel()" name="radio_pupil"></td>'
  document.getElementById('pupilsTable').getElementsByTagName('tbody')[0].appendChild(newRow);

  // Enable the »Delete« button for the first pupil in the list if there are more pupils than one.
  if (lastListIndex > 0){
    document.getElementsByClassName("pupilRow")[0].cells[0].children[0].disabled = ""
  } else {
    document.getElementsByClassName("pupilRow")[0].cells[0].children[0].disabled = true
  }

  // Add pupil to the SESSION variable.
  if (! guionly){
    SESSION[0].pupils[SESSION[0].pupils.length] = generatePupilDataset(fn, ln)
  }
};


function deletePupil(e){
  let deletedPupilNumber = parseInt(e.parentElement.parentElement.cells[2].innerText)
  // If the deleted element is the active pupil …
  if (e.parentElement.parentElement.cells[5].children[0].checked){
    // … and is the last element in the table, …
    if (deletedPupilNumber + 1 == e.parentElement.parentElement.parentElement.rows.length - 1){
      // … then make the second-last pupil in the table the active one.
      e.parentElement.parentElement.parentElement.parentElement.rows[deletedPupilNumber].cells[5].children[0].checked = true
    } else {
      // Otherwise, if the deleted and active pupil isn’t the last one, activate the next one in the table (same index as the deleted one).
      e.parentElement.parentElement.parentElement.parentElement.rows[deletedPupilNumber + 2].cells[5].children[0].checked = true
    }
  }

  // From the deleted pupil onwards, reduce each index number by one.
  document.getElementById('pupilsTable').deleteRow(deletedPupilNumber + 1)
  let pupilsList = document.getElementsByClassName('pupilRow')
  for (let i = deletedPupilNumber - 1; i < pupilsList.length; i++){
    pupilsList[i].cells[2].children[0].innerText = (parseInt(pupilsList[i].cells[2].children[0].innerText) - 1).toString()
  }

  // Disable the delete button of the first pupil table entry in case there is only one left after deletion.
  if (document.getElementsByClassName("pupilRow").length == 1){
    document.getElementsByClassName("pupilRow")[0].cells[0].children[0].disabled = true
  }

  // Move every pupil below the deleted pupil up by one position.
  SESSION[0].pupils[deletedPupilNumber - 1] = null
  for (let p = deletedPupilNumber - 1; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p] = SESSION[0].pupils[p+1]
  }

  // Reduce the pupils list size by one.
  SESSION[0].pupils.length = SESSION[0].pupils.length - 1
}


function importPupils(e){
  SESSION[0].pupils.length = 0
  if (e.files.length == 0){
    return
  }
  
  // Initialize a new file reader.
  let reader = new FileReader();
  reader.onload = (e) => {
    
    // Read the file and remove carriage returns as well as literal line feeds.
    const file = e.target.result.replace(/\r/g, "").replace(/\\n\"/g, "\"")
    let lines = {}
    
    if (file.match(";")){
      // The case of a name list that has been generated by this program, names separated by semicolon.
      lines = file.split(";")
    } else {
      // A hand-crafted name list (maybe a CSV file) with line-feed-separated name.
      lines = file.split(/\n/)
    }

    // Reset the pupils table.
    while (document.getElementById('pupilsTable').rows.length != 2){
      document.getElementById('pupilsTable').deleteRow(2)
    }

    // Iterate over the pupils found in the file.
    for (l in lines){
      // Delete double, trailing, and leading spaces.
      lines[l] = lines[l].replace(/^ +/, "").replace(/ {2,}/, " ").replace(/ +$/, "")

      let last = ""
      let first = ""

      if (lines[l].match(",")){
        // [Last name], [first name].
        first = lines[l].replace(/^[^,]*, */, "")
        last = lines[l].replace(/ *,.*$/, "")
      } else {
        // [First name] [last name].
        first = lines[l].replace(/[^ ]+$/, "").replace(/ *$/, "")
        last = lines[l].replace(new RegExp('^' + first + ' *'), "")
      }

      if (first != "" && last != ""){
        addPupil(first, last);
      }
    }

    if (SESSION[0].pupils.length > 0){
      // Activate the first pupil in the list.
      document.getElementsByName('radio_pupil')[0].checked = true
      updateFinalRemarksPanel()

      if (getSelectedSubject() && getSelectedSubject().name){
        updateSubjectPanel()
      }
    } else {
      window.alert("Die ausgewählte Namensdatei scheint ungültig zu sein und konnte nicht geladen werden.")
    }
  }

  reader.onerror = (e) => alert(e.target.error.name);
  reader.readAsText(e.files[0]);
}


function checkbox_togglePrintAll(e){
  let printPupilCheckboxes = document.getElementsByName("printPupilCheckbox");
  if (e.checked){
    for (c in printPupilCheckboxes){
      printPupilCheckboxes[c].checked = true
    }
  } else {
    for (c in printPupilCheckboxes){
      printPupilCheckboxes[c].checked = ""
    }
  }
}


function exportPupilsList(){
  let s = ""
  let pupils = document.getElementsByClassName("pupilRow")

  for (p in pupils){
    if (pupils[p].children){
      s = s + pupils[p].children[4].children[0].value + "," + pupils[p].children[3].children[0].value + ";"
    }
  }

  document.getElementById("exportPupilsList_prompt").href = 'data:text/plain;charset=utf-8,' + s
  document.getElementById("exportPupilsList_prompt").click()
}



/******************************************************************
* Session routines: transfer GUI values to the session variables. *
******************************************************************/


function updateSession_class(e){
  SESSION[0].class = e.value
  updateNamePreviewLabel(document.getElementById("sessionFilesName_input"))
}


function updateSession_firstName(e){
  let index = e.parentNode.parentNode.cells[2].children[0].innerText
  SESSION[0].pupils[index - 1].firstName = e.value
}


function updateSession_lastName(e){
  let index = e.parentNode.parentNode.cells[2].children[0].innerText
  SESSION[0].pupils[index - 1].lastName = e.value
}


function updateSession_subjectName(){
  let list = document.getElementById("list_subjects")
  let index = list.selectedIndex
  let value = list.options[index].innerText

  for (let p = 0; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p].subjects[index].name = value
  }
}


function updateSession_toggleDaysAbsentPrint(e){
  let index = getSelectedPupil().index
  SESSION[0].pupils[index].daysAbsent_print = e.checked
}


function updateSession_togglePrint(e){
  let index = e.parentNode.parentNode.cells[2].children[0].innerText
  SESSION[0].pupils[index - 1].print = ! SESSION[0].pupils[index - 1].print
}


function updateSession_togglePrintAll(e){
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p].print = e.checked
  }
}


function updateSession_subjectContents(e){
  SESSION[0].pupils[getSelectedPupil().index].subjects[getSelectedSubject().index].contents = e.value      
}


function updateSession_subjectEvaluation(e){
  SESSION[0].pupils[getSelectedPupil().index].subjects[getSelectedSubject().index].evaluation = e.value//.replace(/{[Vv][Oo][Rr][Nn][Aa][Mm][Ee]}/g, getSelectedPupil().firstName)
}


function updateSession_subjectTeacher(e){
  SESSION[0].pupils[getSelectedPupil().index].subjects[getSelectedSubject().index].teacher = e.value
}


function updateSession_subjectMark(e){
  SESSION[0].pupils[getSelectedPupil().index].subjects[getSelectedSubject().index].mark = e.value
}


function updateSession_pupilDaysAbsent(e){
  SESSION[0].pupils[getSelectedPupil().index].daysAbsent = e.value
}


function updateSession_pupilDaysAbsent_unexplained(e){
  SESSION[0].pupils[getSelectedPupil().index].daysAbsent_unexplained = e.value
}


function updateSession_pupilFinalRemarks(e){
  SESSION[0].pupils[getSelectedPupil().index].finalRemarks = e.value
}


function updateSession_eurythmyRow_author(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()
  let index = e.parentNode.parentNode.dataset.index

  SESSION[0].pupils[p.index].subjects[s.index].works[index].author = e.value
}


function updateSession_eurythmyRow_work(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()
  let index = e.parentNode.parentNode.dataset.index

  SESSION[0].pupils[p.index].subjects[s.index].works[index].work = e.value
}


function updateSession_pupilJahresarbeit_firstReader(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].firstReader = e.value
}


function updateSession_pupilJahresarbeit_secondReader(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].secondReader = e.value
}


function updateSession_pupilJahresarbeit_topic(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].topic = e.value
}


function updateSession_pupilJahresarbeit_evaluation(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].evaluation = e.value
}


function updateSession_pupilKlassenspiel_contents(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].contents = e.value
}


function updateSession_pupilKlassenspiel_evaluation(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].evaluation = e.value
}


function updateSession_finalEurythmy_evaluation(e){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  SESSION[0].pupils[p.index].subjects[s.index].evaluation = e.value
}



/***************************************
* Session routines: save, load, merge. *
***************************************/


function saveSession(){
  let sessionString = JSON.stringify(SESSION, null, "  ");

  let file = new Blob( [ new TextEncoder().encode( sessionString ) ], { type: 'application/json;charset=utf-8' } )

  document.getElementById("saveSession_prompt").href = URL.createObjectURL(file)
  let c = (document.getElementById("input_class").value != "" && " Klasse " + document.getElementById("input_class").value) || ""
  document.getElementById("saveSession_prompt").download = c + ", Sitzung.json"
  document.getElementById("saveSession_prompt").click()
}


function chooseSessionsToMerge(e){
  const files = e.files

  // Reset the lists shown in the import dialog dialog.
  document.getElementById("message_import_newPupils").innerText = ""
  document.getElementById("message_import_newSubjects").innerText = ""

  // Clear the variable for imported sessions.
  SESSIONS_imported = []

  for (let i = 0; i < files.length; i++){
    let reader = new FileReader();

    reader.onload = function(e){
      // The whole imported session as a string. Remove carriage returns and literal line feeds. (Issue of name and subject lists created on MacOS?)
      SESSIONS_imported[SESSIONS_imported.length] = e.target.result.replace(/\r/g, "").replace(/\\n\"/g, "\"");

      // Proceed as soon as all files were loaded.
      if (SESSIONS_imported.length == files.length){
        let overlay_pupilsList = ""
        let overlay_subjectsList = ""

        for (let i = 0; i < SESSIONS_imported.length; i++){
          // Get a list of new pupils.
          let re = new RegExp('\\"firstName\\": \\"[^"]*\\",\n *\\"lastName\\": \\"[^"]*\\"', 'g')
          let finds = SESSIONS_imported[i].match(re)
          for (let j = 0; j < finds.length; j++){
            let fn = finds[j].match(/(?<=firstName\": ")[^"]*/)
            let ln = finds[j].match(/(?<=lastName\": ")[^"]*/)
            if (! overlay_pupilsList.match(fn + " " + ln + "\n") && ! JSON.stringify(SESSION).match('"firstName":"' + fn + '","lastName":"' + ln + '"')){
              overlay_pupilsList += "– " + fn + " " + ln + "\n"
            }
          }

          // Get a list of new subjects.
          re = new RegExp('\\"name\\": \\"[^"]*\\"', 'g')
          finds = SESSIONS_imported[i].match(re)
          for (let j = 0; j < finds.length; j++){
            let name = finds[j].match(/(?<=\"name\": \")[^"]*/)
            if (! overlay_subjectsList.match("– " + name + "\n")){
              overlay_subjectsList += "– " + name + "\n"
            }
          }
        }

        if (overlay_pupilsList == ""){
          document.getElementById("message_import_newPupils").innerHTML = "– <i>keine</i> –"
        } else {
          document.getElementById("message_import_newPupils").innerText = overlay_pupilsList
        }

        document.getElementById("message_import_newSubjects").innerText = overlay_subjectsList

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
  for (let s = 0; s < SESSIONS_imported.length; s++){
    SESSION_TEMP = eval(JSON.parse(SESSIONS_imported[s]))
    
    // Add pupils who haven’t been in the session before.
    for (let j = 0; j < SESSION_TEMP[0].pupils.length; j++){
      let fn = SESSION_TEMP[0].pupils[j].firstName
      let ln = SESSION_TEMP[0].pupils[j].lastName
      // Save the pupil’s index to easily access it in the next step: copying subject info to the main SESSION variable.
      SESSION_TEMP[0].pupils[fn] = []
      SESSION_TEMP[0].pupils[fn][ln] = []
      SESSION_TEMP[0].pupils[fn][ln].index = j
      if (! JSON.stringify(SESSION).match('"firstName":"' + fn + '","lastName":"' + ln + '"')){
        addPupil(fn, ln)
      }
    }

    // Add subject info from the imported session.
    for (let i = 0; i < SESSION_TEMP[0].pupils[0].subjects.length; i++){
      // Add the subject to the session if not already present.
      if (! JSON.stringify(SESSION[0].pupils[0].subjects).match('"name":"' + SESSION_TEMP[0].pupils[0].subjects[i].name + '"')){
        addSubject(SESSION_TEMP[0].pupils[0].subjects[i].name)
      }
      // Iterate over all pupils in SESSION, get their session index from SESSION_imported and write SESSION_imported’s subject info to SESSION for that pupil.
      for (let j = 0; j < SESSION[0].pupils.length; j++){
        let pFirstName = SESSION[0].pupils[j].firstName
        let pLastName = SESSION[0].pupils[j].lastName

        // If the pupil has an index in the imported session (Religion might be an example for imported subjects which don’t contain all pupils), …
        if (SESSION_TEMP[0].pupils[pFirstName] && SESSION_TEMP[0].pupils[pFirstName][pLastName]){
          // … and get the subject’s index in the current session.
          re = new RegExp('.*"name":"' + SESSION_TEMP[0].pupils[0].subjects[i].name + '"')
          let subjects_currentSession = JSON.stringify(SESSION[0].pupils[j].subjects).match(re)[0]
          let index_subject_current = subjects_currentSession.match(/"name":"/g).length - 1
          
          // Add all keys of the subject to the current session.
          let keys = SESSION_TEMP[0].pupils[SESSION_TEMP[0].pupils[pFirstName][pLastName].index].subjects[i]
          for (const [key, value] of Object.entries(keys)) {
            SESSION[0].pupils[j].subjects[index_subject_current][key] = value
          }
        }
      }
    }
  }
}


function chooseSessionToLoad(e){
  const file = e.files[0]

  if (file){
    let reader = new FileReader()

    reader.onload = function(e){
      // Renew the SESSION variable.
      let session_new = e.target.result.replace(/\r/g, "").replace(/\\n\"/g, "\"")
      SESSION = JSON.parse(session_new)
      
      // Reset the pupils list.
      while (document.getElementById('pupilsTable').rows.length != 2){
        document.getElementById('pupilsTable').deleteRow(2);
      };

      // Add the new pupils from the loaded session.
      for (let p = 0; p < SESSION[0].pupils.length; p++){
        let fn = SESSION[0].pupils[p].firstName
        let ln = SESSION[0].pupils[p].lastName
        addPupil(fn, ln, true)
        if (! SESSION[0].pupils[p].print){
          let rows = document.getElementsByClassName("pupilRow");
          rows[rows.length - 1].children[1].children[0].checked = false
        }
      }
      document.getElementsByName('radio_pupil')[0].checked = true
      updateFinalRemarksPanel()

      // Reset the subjects list.
      while (document.getElementById("list_subjects").length != 0){
        document.getElementById("list_subjects").remove(0)
      };

      // Add the new subjects from the loaded session.
      for (s in SESSION[0].pupils[0].subjects){
        let name_subject = SESSION[0].pupils[0].subjects[s].name
        addSubject(name_subject, true)
      }
      document.getElementById("list_subjects").selectedIndex = 0
      document.getElementById("input_subjectName").value = document.getElementById("list_subjects")[0].innerText
      document.getElementById("button_moveSubjectUp").disabled = true
      updateSubjectPanel()

      // Set the special input values class, year and date.
      document.getElementById("input_class").value = SESSION[0].class || ""
      document.getElementById("label_year").innerText = SESSION[0].year || ""
      document.getElementById("input_date").value = SESSION[0].date || ""
    }

    reader.readAsText(file)
  }
}   



/********************
* Subject routines. *
********************/


function addSpecialPage(e){
  let selector = document.getElementById("specialPageSelector")
  addSubject("Sonderseite: " + selector.value)

  selector[selector.selectedIndex].disabled = true
  selector[selector.selectedIndex].title = "Dieses Fach ist bereits gelistet." // Tooltip text.
  selector.selectedIndex = 0
  e.disabled = true
}


function addSubject(subjectName, guionly){
  let name = subjectName || "leeres Fach"
  let list = document.getElementById("list_subjects");
  let opt = document.createElement("option");
  opt.text = name;
  list.add(opt);

  if (name.match(/^Sonderseite/)){
    list = document.getElementById("specialPageSelector").options
    for (i in list){
      if (name.match("Sonderseite: " + list[i].innerText)){
        list[i].disabled = true
        break
      }
    }
  }

  // Add the new subject to all pupils of the SESSION variable.
  if (! guionly){
    addSubjectToAllPupils(name)
  }

  // Allow/Disallow deleting subjects if there is/isn’t more than one in the list.
  if (list.length > 1){
    document.getElementById("button_deleteSubject").disabled = ""
  } else {
    document.getElementById("button_deleteSubject").disabled = true
  }

  // Enable and disable the move-subject-buttons.
  toggleSensitivity_moveSubjectButtons()
}


function toggleSensitivity_addSpecialPageButton(e){
  let b = document.getElementById("button_addSpecialPage")
  if (e.selectedIndex > 0){
    b.disabled = ""
  } else {
    b.disabled = true
  }
}


function toggleSensitivity_moveSubjectButtons(){
  let list = document.getElementById("list_subjects");
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

function updateSubjectNameInput(e){
  if (e.selectedIndex > -1){
    let value = e.options[e.selectedIndex].innerText;
    let input = document.getElementById("input_subjectName")
    input.value = value

    if (input.value.match(/^Sonderseite: /)){
      input.disabled = true
      input.title = "Namen von Sonderseiten können nicht editiert werden."
    } else {
      input.disabled = ""
      input.title = ""
    }
  }

  // Enable and disable the move-subject-buttons.
  toggleSensitivity_moveSubjectButtons()
};


// When changing the name of a subject, update the name in the subjects list as well.
function updateSubjectNameInList(e){
  let list = document.getElementById("list_subjects");
  let index = list.selectedIndex;
  let opt = document.createElement("option");
  opt.value = index.toString()
  opt.text = e.value;
  list.remove(index);
  list.add(opt, index);
  list.selectedIndex = index
};


// After having deleted a special subject, reenable it in the special subjects dropdown menu.
function reenableSpecialSubject(name){
  let specialSubjects = document.getElementById("specialPageSelector").options
  for (let s = 0; s < specialSubjects.length; s++){
    if (specialSubjects[s].value == name.replace("Sonderseite: ", "")){
      specialSubjects[s].title = ""
      specialSubjects[s].disabled = ""
      break
    }
  }
}


function deleteSubjectFromList(e){
  let list = e
  if (list){
    if (event.key != "Delete" || e.length <= 1){
      return
    }
  } else {
    list = document.getElementById("list_subjects");
  }
  let index = list.selectedIndex;

  // Reenable the deleted subject in the special subject list, if the deleted is a special one.
  if (list[index].innerText.match(/^Sonderseite: /)){
    reenableSpecialSubject(list.options[index].innerText)
  }
  
  list.remove(index);
  list.selectedIndex = Math.min(index, list.length - 1);
  document.getElementById("input_subjectName").value = list.options[list.selectedIndex].innerText;
  
  // Delete the selected subject from all pupils.
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p].subjects[index] = null
    for (let i = index; i < SESSION[0].pupils[p].subjects.length - 1; i++){
      SESSION[0].pupils[p].subjects[i] = SESSION[0].pupils[p].subjects[i + 1]
    }
    SESSION[0].pupils[p].subjects.length = SESSION[0].pupils[p].subjects.length - 1
  }
  
  // Disable the delete button, if the list has only one entry after the deletion.
  if (list.length == 1){
    document.getElementById("button_deleteSubject").disabled = true
  }
  
  updateSubjectPanel()
  
  // Enable and disable the move-subject-buttons.
  toggleSensitivity_moveSubjectButtons()
}


function changeSubjectWithinInput(e){
  let list = document.getElementById("list_subjects");
  let index = list.selectedIndex;
  if (event.key == "ArrowDown"){
    list.selectedIndex = Math.min(index + 1, list.length - 1);
    e.value = list.options[list.selectedIndex].innerText
  };
  if (event.key == "ArrowUp"){
    list.selectedIndex = Math.max(index - 1, 0);
    e.value = list.options[list.selectedIndex].innerText
  } 
};


function moveSubject(delta){
  // Move down: delta = 1.
  // Move up: delta = -1.
  let list = document.getElementById("list_subjects");
  let index = list.selectedIndex;
  if (delta == 1 && index < list.length - 1 && index > -1){
    list.add(list[index + 1], index);
  } else if (delta == -1 && index > 0){
    list.add(list[index], index - 1);
  } else {
    return
  }

  list.selectedIndex = index + delta

  // Move subject down in the SESSION variable.
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    let tmp = SESSION[0].pupils[p].subjects[index + delta]
    SESSION[0].pupils[p].subjects[index + delta] = SESSION[0].pupils[p].subjects[index]
    SESSION[0].pupils[p].subjects[index] = tmp
  }

  // Enable and disable the move-subject-buttons.
  toggleSensitivity_moveSubjectButtons()
}


function importSubjects(e){
  if (e.files.length == 0){
    return;
  };

  let reader = new FileReader();
  reader.onload = function(e){
    const file = e.target.result.replace(/\r/g, "").replace(/\\n\"/g, "\"");

    // Only load the file into the program if it’s not larger than 1024 bytes (avoid crashing).
    if (file.length <= 1024){
      let lines = {}

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
      for (let p = 0; p < SESSION[0].pupils.length; p++){
        SESSION[0].pupils[p].subjects = []
      }

      for (l in lines){
        // Delete double, trailing, and leading spaces.
        lines[l] = lines[l].replace(/^ */, "").replace(/ {2,}/, " ").replace(/ *$/, "");
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
      toggleSensitivity_moveSubjectButtons()
    } else {
      window.alert("Die gewählte Datei scheint zu groß für eine Fächerliste (größer als 1024 Byte). Bitte prüfen.")
    }
  };

  reader.onerror = function(e){
    alert(e.target.error.name);
  }
  reader.readAsText(e.files[0]);
};


function exportSubjectsList(){
  let s = ""
  let list = document.getElementById("list_subjects")

  for (let i = 0; i < list.length; i++){
    if (list.options[i].innerText){
      s = s + list.options[i].innerText + ";"
    }
  }

  document.getElementById("exportSubjectsList_prompt").href = 'data:text/plain;charset=utf-8,' + s

  // Click the invisible download button to prompt the user to save the file.
  document.getElementById("exportSubjectsList_prompt").click()
}


function applySubjectContentsToAll(){
  let pIndex = getSelectedPupil().index
  let sIndex = getSelectedSubject().index
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p].subjects[sIndex].contents = SESSION[0].pupils[pIndex].subjects[sIndex].contents
  }

  let b = document.getElementById("button_applySubjectContentsToAll")
  let t = b.innerText
  b.innerText = "Inhalte wurden übertragen!"
  setTimeout(
    function(){
      b.innerText = t
    },
    2000
  )
}


function applyTeacherToAll(){
  let pIndex = getSelectedPupil().index
  let sIndex = getSelectedSubject().index
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p].subjects[sIndex].teacher = SESSION[0].pupils[pIndex].subjects[sIndex].teacher
  }

  let b = document.getElementById("button_applyTeacherToAll")
  let t = b.innerText
  b.innerText = "Lehrer wurde übertragen!"
  setTimeout(
    function(){
      b.innerText = t
    },
    2000
  )
}


function applyKlassenspielContentsToAll(){
  let pIndex = getSelectedPupil().index
  let sIndex = getSelectedSubject().index
  for (let p = 0; p < SESSION[0].pupils.length; p++){
    SESSION[0].pupils[p].subjects[sIndex].contents = SESSION[0].pupils[pIndex].subjects[sIndex].contents
  }

  let b = document.getElementById("button_applyKlassenspielContentsToAll")
  let t = b.innerText
  b.innerText = "Inhalte wurden übertragen!"
  setTimeout(
    function(){
      b.innerText = t
    },
    2000
  )
}


function updateSubjectPanel(){
  let p = getSelectedPupil()
  let s = getSelectedSubject()

  let sPages = document.getElementsByClassName("subjectInfoPage")
  
  for (let i = 0; i < sPages.length; i++){
    if (sPages[i].style.display == "block"){
      sPages[i].style.display = "none"
      break
    }
  }

  if (s.name.match("Sonderseite: Eurythmie")){
    document.getElementById("eurythmyabschlussPage").style.display = "block"
    document.getElementById("eurythmyabschlussPage").style.opacity = 1
    let t = document.getElementById("eurythmyTable")
    
    // Delete all eurythmy rows but the header.
    while (t.rows.length > 1){
      t.deleteRow(1)
    }
    
    // If the pupil has no eurythmy works yet, create an empty array for him/her.
    if (! SESSION[0].pupils[p.index].subjects[s.index].works){
      SESSION[0].pupils[p.index].subjects[s.index].works = []
    }
    
    for (w in SESSION[0].pupils[p.index].subjects[s.index].works){
      if (! t.rows[w + 1]){
        addEurythmieRow_GUI()
      }
      t.rows[t.rows.length - 1].cells[1].children[0].value = SESSION[0].pupils[p.index].subjects[s.index].works[w].author || ""
      t.rows[t.rows.length - 1].cells[2].children[0].value = SESSION[0].pupils[p.index].subjects[s.index].works[w].work || ""
    }
    
    while (t.rows.length > SESSION[0].pupils[p.index].subjects[s.index].works.length + 1 && t.rows.length > 2){
      t.deleteRow(t.rows.length - 1)
    }
    
    if (t.rows.length == 2){
      t.rows[1].cells[0].children[0].disabled = true
    }
    
    if (t.rows.length == 1){
      addEurythmieRow_GUI()
      addEurythmieRow_session()
    }
    
    document.getElementById("textarea_finalEurythmy_evaluation").value = SESSION[0].pupils[p.index].subjects[s.index].evaluation || ""

  } else if (s.name.match("Sonderseite: Jahresarbeit")){        
    document.getElementById("jahresarbeitPage").style.display = "block"
    document.getElementById("jahresarbeitPage").style.opacity = 1
    
    document.getElementById("input_jahresarbeit_firstReader").value = SESSION[0].pupils[p.index].subjects[s.index].firstReader || ""
    document.getElementById("input_jahresarbeit_secondReader").value = SESSION[0].pupils[p.index].subjects[s.index].secondReader || ""
    document.getElementById("input_jahresarbeit_topic").value = SESSION[0].pupils[p.index].subjects[s.index].topic || ""
    document.getElementById("textarea_jahresarbeit_evaluation").value = SESSION[0].pupils[p.index].subjects[s.index].evaluation || ""
  
  } else if (s.name.match("Sonderseite: Klassenspiel")){
    document.getElementById("klassenspielPage").style.display = "block"
    document.getElementById("klassenspielPage").style.opacity = 1
    
    document.getElementById("textarea_klassenspiel_contents").value = SESSION[0].pupils[p.index].subjects[s.index].contents || ""
    document.getElementById("textarea_klassenspiel_evaluation").value = SESSION[0].pupils[p.index].subjects[s.index].evaluation || ""
    document.getElementById("heading_klassenspiel_evaluation").innerText = "Bewertung für " + SESSION[0].pupils[p.index].firstName.match(/^[^ ]*/)
  
  } else {
    document.getElementById("defaultPage").style.display = "block"
    document.getElementById("defaultPage").style.opacity = 1
    
    let heading1 = document.getElementById("heading_subjectContents");
    let heading2 = document.getElementById("heading_evaluation");
    
    heading1.innerText = "Inhalte im Fach " + s.name + ":";
    heading2.innerText = "Bewertung für " + p.firstName.match(/^[^ ]*/) + ":"
    
    document.getElementById("input_teacher").value = SESSION[0].pupils[p.index].subjects[s.index].teacher || ""
    document.getElementById("input_mark").value = SESSION[0].pupils[p.index].subjects[s.index].mark || ""
    document.getElementById("textarea_subjectContents").value = SESSION[0].pupils[p.index].subjects[s.index].contents || ""
    document.getElementById("textarea_evaluation").value = SESSION[0].pupils[p.index].subjects[s.index].evaluation || ""
  }
}


function addEurythmieRow_GUI(){
  let t = document.getElementById("eurythmyTable")

  let lastListIndex = document.getElementsByClassName("eurythmyRow").length;
  let newRow = document.createElement('TR');
  newRow.classList.add("eurythmyRow");
  newRow.innerHTML = '<tr class="eurythmyRow"><td align=right><button type="button" title="Werk löschen" onclick="deleteEurythmieRow(this)">Löschen</td><td><input type="text" class="input_eurythmyRow" onchange="deleteExcessSpaces(this)" oninput="updateSession_eurythmyRow_author(this)"></td><td><input type="text" class="input_eurythmyRow" onchange="deleteExcessSpaces(this)" oninput="updateSession_eurythmyRow_work(this)"></td></tr>'
  newRow.setAttribute("data-index", lastListIndex)
  t.getElementsByTagName("tbody")[0].appendChild(newRow);

  if (lastListIndex > 0){
    t.rows[1].cells[0].children[0].disabled = ""
  } else {
    t.rows[1].cells[0].children[0].disabled = true
  }
}


function addEurythmieRow_session(){
  let p = getSelectedPupil()
  let s = getSelectedSubject()
  let w = SESSION[0].pupils[p.index].subjects[s.index].works

  w[w.length] = {"author": "", "work": ""}
}


function deleteEurythmieRow(e, i){
  let p = getSelectedPupil()
  let s = getSelectedSubject()
  let index = parseInt(e.parentNode.parentNode.dataset.index)
  if (i){
    index = i
  }
  let t = document.getElementById("eurythmyTable")

  t.deleteRow(index + 1)
  for (let i = index; i < t.rows.length; i++){
    t.rows[i].setAttribute("data-index", (i - 1).toString())
    SESSION[0].pupils[p.index].subjects[s.index].works[i] = SESSION[0].pupils[p.index].subjects[s.index].works[i + 1]
  }
  SESSION[0].pupils[p.index].subjects[s.index].works.length -= 1

  if (t.rows.length == 2){
    t.rows[1].cells[0].children[0].disabled = true
  }
}


function getSelectedSubject(){
  let index = document.getElementById("list_subjects").selectedIndex
  if (index > -1){
    let name = document.getElementById("list_subjects").options[document.getElementById("list_subjects").selectedIndex].innerText
    return {"name": name, "index": index}
  }
}


function updateFinalRemarksPanel(){
  let p = getSelectedPupil()
  let i = p.index
  let name = p.firstName.match(/^[^ ]*/)
  document.getElementById("input_daysAbsent").value = SESSION[0].pupils[i].daysAbsent || ""
  document.getElementById("input_daysAbsent_unexplained").value = SESSION[0].pupils[i].daysAbsent_unexplained || ""
  document.getElementById("checkbox_daysAbsent_print").checked = SESSION[0].pupils[i].daysAbsent_print || ""
  document.getElementById("heading_panel_finalRemarks").innerText = "Bemerkungen für " + name + ":"
  if (SESSION[0].pupils[i].panel_finalRemarks){
    SESSION[0].pupils[i].finalRemarks = SESSION[0].pupils[i].panel_finalRemarks;
  }
  document.getElementById("textarea_panel_finalRemarks").value = SESSION[0].pupils[i].finalRemarks || ""
}    



/***************************
* Session file processing. *
***************************/


function checkbox_toggleProcessAll(e){
  let processSessionFileCheckboxes = document.getElementsByName("processSessionFileCheckbox");
  if (e.checked){
    for (c in processSessionFileCheckboxes){
      processSessionFileCheckboxes[c].checked = true
    }
  } else {
    for (c in processSessionFileCheckboxes){
      processSessionFileCheckboxes[c].checked = ""
    }
  }
}


var SESSIONFILES = []

function updateSessionFilesList(oldPath, newPath){
  if (oldPath != newPath){
    console.log("UPDATING LIST WITH", newPath)
    // Reset the SESSIONFILES variable.
    SESSIONFILES = []

    // Delete all rows within the session files list.
    let targetTable = document.getElementById('savedSessionsListTableBody')
    while (targetTable.children.length > 0){
      targetTable.deleteRow(0)
    }

    if (fs.existsSync(newPath)){
      let files = fs.readdirSync(newPath);
      for (f = 0; f < files.length; f++){
        if (files[f].match(/\.json$/)){
          SESSIONFILES.push([true, files[f]])
          let lastListIndex = document.getElementsByClassName("sessionFileRow").length;
  
          let newRow = document.createElement('TR');
          newRow.classList.add("sessionFileRow");
          newRow.innerHTML = '<td></td>\
            <td align=center class="checkboxCell"><input type="checkbox" name="processSessionFileCheckbox" checked value=' + lastListIndex + ' onclick=updateSessionFilesListVar(this)></td>\
            <td><input type="text" class="input_name" value="' + files[f] + '" readonly></td>\
            <td align=center class="radioCell"><input type="radio" onclick="updateSessionFileInfo(this)" name="radio_sessionFile" value=' + targetTable.children.length + '></td>'
          targetTable.appendChild(newRow);
        }
      }
      console.log(files)
      if (targetTable.children.length > 0){
        targetTable.children[0].children[3].children[0].checked = true
        document.getElementById("quantityOfSessionFiles").innerText = targetTable.children.length
        if (targetTable.children.length == 1){
          document.getElementById("quantityOfSessionFiles_plural_prefix").innerText = ""
          document.getElementById("quantityOfSessionFiles_plural_suffix").innerText = ""
        } else {
          document.getElementById("quantityOfSessionFiles_plural_prefix").innerText = "n"
          document.getElementById("quantityOfSessionFiles_plural_suffix").innerText = "en"
        }
      } else {
        document.getElementById("quantityOfSessionFiles").innerText = "keine"
        document.getElementById("quantityOfSessionFiles_plural_prefix").innerText = "n"
        document.getElementById("quantityOfSessionFiles_plural_suffix").innerText = "en"
      }
  
      document.getElementById("sessionFilesDirectory_input").value = newPath
      updateSessionFileInfo({"value" : "0"})
    }
  }
}


function updateSessionFilesListVar(e){
  SESSIONFILES[e.value][0] = e.checked
  console.log(SESSIONFILES)
}


function updateSessionFileInfo(e){
  console.log("updateSessionFileInfo() triggered")
  let sessionFileRows = document.getElementsByClassName("sessionFileRow")
  if (sessionFileRows.length == 0){
    document.getElementById("sessionFileInfo").style.display = "none"
    return
  } else {
    document.getElementById("sessionFileInfo").style.display = "unset"
  }
  document.getElementById("sessionFileInfo_name").innerText = sessionFileRows[e.value].children[2].children[0].value
  let sessionFilePath = path.join(document.getElementById("sessionFilesDirectory_input").value, sessionFileRows[e.value].children[2].children[0].value)

  console.log("sessionFilesDirectory_input.value", document.getElementById("sessionFilesDirectory_input").value)
  
  fs.access(sessionFilePath,
    (err) => {
      console.log(err)
      if (err) {
      //  console.log('does not exist. Trying to create a default config file.')
      //  try {
      //    fs.writeFileSync(configFilePath, '{\n  "sessionFilesPath" : "' + sessionFilesPath + '"\n}', 'utf-8')
      //    window.webContents.executeJavaScript(`document.getElementById("sessionFilesDirectory_input").value = "` + sessionFilesPath + `"`)
      //  } catch(e) {
      //    console.log('Failed to save the file !')
      //  }
      } else {
      //  console.log('exists')
      //  let configContents = ""
        fs.readFile(sessionFilePath, 'utf-8',
          (err, data) => {
            if(err){
              console.log("An error ocurred reading the file! " + err.message);
              return;
            }
            let sessionContents = JSON.parse(data)
            console.log(data)
            console.log(sessionContents)
            document.getElementById("sessionFileInfo_class").innerText = sessionContents[0].class
            document.getElementById("sessionFileInfo_year").innerText = sessionContents[0].year
            document.getElementById("sessionFileInfo_certDate").innerText = sessionContents[0].date
            let pupilsList = ""
            for (let p = 0; p < sessionContents[0].pupils.length; p++){
              pupilsList += sessionContents[0].pupils[p].lastName + ", " + sessionContents[0].pupils[p].firstName
              if (p < sessionContents[0].pupils.length - 1){
                pupilsList += "; "
              }
            }
            document.getElementById("sessionFileInfo_pupils").innerText = pupilsList

            let subjectsList = ""
            for (let s = 0; s < sessionContents[0].pupils[0].subjects.length; s++){
              // Add the subject to the session if not already present.
              //if (! JSON.stringify(sessionContents[0].pupils[0].subjects).match('"name":"' + sessionContents[0].pupils[0].subjects[i].name + '"')){
              //  addSubject(SESSION_TEMP[0].pupils[0].subjects[i].name)
              //}
              subjectsList += sessionContents[0].pupils[0].subjects[s].name
              if (s < sessionContents[0].pupils[0].subjects.length - 1){
                subjectsList += "; "
              }
            }
            document.getElementById("sessionFileInfo_subjects").innerText = subjectsList
          }
        )

        fs.stat(sessionFilePath,
          (err, stats) => {
            let modTime = stats.mtime.getHours().toString().padStart(2, "0") + ":" +
              stats.mtime.getMinutes().toString().padStart(2, "0") + ":" +
              stats.mtime.getSeconds().toString().padStart(2, "0") + " Uhr, " + 
              stats.mtime.getDate().toString().padStart(2, "0") + "." + 
              stats.mtime.getMonth().toString().padStart(2, "0") + "." +
              stats.mtime.getFullYear().toString()
            document.getElementById("sessionFileInfo_saveDate").innerText = modTime
          }
        )
      }
    }
  )
}


function toggleDeleteTeXDespiteErrorsEnabled(e){
  let box = document.getElementById("deleteTeXDespiteErrors")
  box.disabled = ! e.checked
  if (e.checked){
    box.parentNode.children[1].removeAttribute("disabled")
  } else {
    box.parentNode.children[1].setAttribute("disabled", true)
  }
  console.log(box.parentNode.children)
}

const child_process = require("child_process")//spawnSync
const os = require("os")

var certPath = ""
var certName = ""

console.log(os.platform(), os.arch())

//~ function generatePDF(originBaseDir, tempBaseDir){
  //~ console.log("generatePDF function from main.js, using ", originBaseDir, "and", tempBaseDir)
  //~ let sessionsDir = document.getElementById("sessionFilesDirectory_input").value
  //~ document.getElementById("pdfGenerationLog").value += "\nStart …"
  //~ fs.symlink(path.join(originBaseDir, "data", "backend"), tempBaseDir, "dir")
  //~ fs.symlink(sessionsDir, path.join(tempBaseDir, "temp"), "dir")
  //~ document.getElementById("pdfGenerationLog").value += "\nErzeuge symbolische Verknüpfungen des Sitzungsverzeichnisses …"
  //~ let sessionFileRows = document.getElementsByClassName("sessionFileRow")
  //~ fs.mkdir(path.join(document.getElementById("pdfOutputDirectory_input").value), {recursive: true})
  //~ for (i = 0; i < sessionFileRows.length; i++){
    //~ // Check if the session file is checked in the session files list, i.e. if it is supposed to be processed.
    //~ if (sessionFileRows[i].children[1].children[0].checked){
      //~ document.getElementById("pdfGenerationLog").value += "\nVerarbeite Sitzungsdatei " + sessionFileRows[i].children[2].children[0].value + " …"
      //~ document.getElementById("pdfGenerationLog").value += "\n  Erzeuge die TeX-Dateien …"
      //~ // Differentiate here to catch Windows OS.
      //~ await child_process.spawn(path.join(tempBaseDir, "ulua", "lua"), [path.join(tempBaseDir, "schoolCert.lua"), path.join(tempBaseDir, "temp", sessionFileRows[i].children[2].children[0].value)])
      //~ await fs.readdir(path.join(tempBaseDir, "temp")).then(
        //~ (result) => {
          //~ texFiles = result
        //~ }
      //~ )
      //~ console.log(texFiles)
      //~ for (f = 0; f < texFiles.length; f++){
        //~ if (texFiles[f].match(/\.tex$/)){
          //~ console.log("Found file ", texFiles[f])
          //~ certName = texFiles[f].replace(/\.tex$/, "")
          //~ document.getElementById("pdfGenerationLog").value += "\nErstelle Zeugnis für " + texFiles[f] + " …"
          //~ // Differentiate the path depending on the OS.
          //~ let userOS = os.platform
          //~ let binaryPath = ""
          //~ if (userOS == "linux"){
            //~ binaryPath = path.join("x86_64-linux", "xelatex")
          //~ }
          //~ if (userOS == "darwin"){
            //~ binaryPath = path.join("x86_64-darwin", "xelatex")
          //~ }
          //~ if (userOS == "win32"){
            //~ binaryPath = path.join("win32", "xelatex.exe")
          //~ }
          //~ if (binaryPath != ""){
            //~ certPath = path.join(tempBaseDir, "temp", texFiles[f])
            //~ let texToPDFProcess = child_process.spawnSync(path.join(tempBaseDir, "TeX", "bin", binaryPath), ["--output-directory=" + path.join(tempBaseDir, "temp"), path.join(tempBaseDir, "temp", texFiles[f])])
            //~ // Open the log file.
            //~ let fileContent = fs.readFileSync(path.join(tempBaseDir, "temp", certName + ".log"), 'utf-8')
            //~ let position = fileContent.search("No pages of output.")
            //~ if (position < 0){
              //~ // Initiate a second TeX run to get the last page number right.
              //~ child_process.spawnSync(path.join(tempBaseDir, "TeX", "bin", binaryPath), ["--output-directory=" + path.join(tempBaseDir, "temp"), path.join(tempBaseDir, "temp", texFiles[f])])
              //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".pdf"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".pdf"))
              //~ document.getElementById("pdfGenerationLog").value += "\n  Zeugnis für " + certName + " wurde erstellt."
              //~ if (document.getElementById("deleteTeX").checked){
                //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".tex"))
              //~ } else {
                //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".tex"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".tex"))
              //~ }
              //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".log"))
            //~ } else {
              //~ document.getElementById("pdfGenerationLog").value += "\n  Fehler beim Erstellen des Zeugnisses für " + certName + "! Bitte Log im PDF-Zielverzeichnis einsehen."
              //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".log"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".log"))
              //~ if (document.getElementById("deleteTeX").checked){
                //~ if (document.getElementById("deleteTeXDespiteErrors").checked){
                  //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".tex"))
                //~ } else {
                  //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".tex"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".tex"))
                //~ }
              //~ } else {
                //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".tex"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".tex"))
              //~ }
            //~ }
            //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".aux"))
          //~ } else {
            //~ document.getElementById("pdfGenerationLog").value += "\nDas genutzte Betriebssystem wird nicht unterstützt und kann keine PDF-Zeugnisse erzeugen."
          //~ }
        //~ }
      //~ }
    //~ }
  //~ }
//~ }


//~ function generatePDF(originBaseDir, tempBaseDir){
  //~ console.log("generatePDF function from main.js, using ", originBaseDir, "and", tempBaseDir)
  //~ let sessionsDir = document.getElementById("sessionFilesDirectory_input").value
  //~ try{
    //~ fs.symlinkSync(sessionsDir, path.join(tempBaseDir, "temp"), "dir")
  //~ } catch(err) {
    //~ // The symlink already exists.
  //~ }
  //~ document.getElementById("pdfGenerationLog").value += "\nErzeuge symbolische Verknüpfungen des Sitzungsverzeichnisses …"
  //~ let sessionFileRows = document.getElementsByClassName("sessionFileRow")
  //~ fs.mkdir(path.join(document.getElementById("pdfOutputDirectory_input").value), {recursive: true},
    //~ (err) => {
      //~ for (i = 0; i < sessionFileRows.length; i++){
        //~ // Check if the session file is checked in the session files list, i.e. if it is supposed to be processed.
        //~ if (sessionFileRows[i].children[1].children[0].checked){
          //~ document.getElementById("pdfGenerationLog").value += "\nVerarbeite Sitzungsdatei " + sessionFileRows[i].children[2].children[0].value + " …"
          //~ document.getElementById("pdfGenerationLog").value += "\n  Erzeuge die TeX-Dateien …"
          //~ // Differentiate here to catch Windows OS.
          //~ child_process.execFile(path.join(tempBaseDir, "ulua", "lua"), [path.join(tempBaseDir, "schoolCert.lua"), path.join(tempBaseDir, "temp", sessionFileRows[i].children[2].children[0].value)], {encoding: "utf8"},
            //~ (err2) => {
              //~ fs.readdir(path.join(tempBaseDir, "temp"),
                //~ (err4, texFiles) => {
                  //~ console.log(err4)
                  //~ for (f = 0; f < texFiles.length; f++){
                    //~ if (texFiles[f].match(/\.tex$/)){
                      //~ console.log("Found file ", texFiles[f])
                      //~ certName = texFiles[f].replace(/\.tex$/, "")
                      //~ document.getElementById("pdfGenerationLog").value += "\nErstelle Zeugnis für " + texFiles[f] + " …"
                      //~ // Differentiate the path depending on the OS.
                      //~ let userOS = os.platform
                      //~ let binaryPath = ""
                      //~ if (userOS == "linux"){
                        //~ binaryPath = path.join("x86_64-linux", "xelatex")
                      //~ }
                      //~ if (userOS == "darwin"){
                        //~ binaryPath = path.join("x86_64-darwin", "xelatex")
                      //~ }
                      //~ if (userOS == "win32"){
                        //~ binaryPath = path.join("win32", "xelatex.exe")
                      //~ }
                      //~ if (binaryPath != ""){
                        //~ console.log("EXECUTING", path.join(tempBaseDir, "TeX", "bin", binaryPath), [path.join(tempBaseDir, "temp", texFiles[f]), "--output-directory=" + path.join(tempBaseDir, "temp")])
                        //~ var blockFurtherProcessing = true
                        //~ certPath = path.join(tempBaseDir, "temp", texFiles[f])
                        //~ child_process.execFile(path.join(tempBaseDir, "TeX", "bin", binaryPath), ["--output-directory=" + path.join(tempBaseDir, "temp"), path.join(tempBaseDir, "temp", texFiles[f])], {encoding: "utf8"},
                          //~ (err3) => {
                            //~ console.log(certPath)
                            //~ console.log(path.join(tempBaseDir, "temp"))
                            //~ console.log(certName)
                            //~ // Open the log file.
                            //~ let fileContent = fs.readFileSync(path.join(tempBaseDir, "temp", certName + ".log"), 'utf-8')
                            //~ let position = fileContent.search("No pages of output.")
                            //~ if (position < 0){
                              //~ // Initiate a second TeX run to get the last page number right.
                              //~ child_process.execFile(path.join(tempBaseDir, "TeX", "bin", binaryPath), ["--output-directory=" + path.join(tempBaseDir, "temp"), path.join(tempBaseDir, "temp", texFiles[f])], "utf8",
                                //~ (err5) => {

                                  //~ fs.rename(path.join(tempBaseDir, "temp", certName + ".pdf"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".pdf"))
                                  //~ document.getElementById("pdfGenerationLog").value += "\n  Zeugnis für " + certName + " wurde erstellt."
                                  //~ if (document.getElementById("deleteTeX").checked){
                                    //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".tex"))
                                  //~ } else {
                                    //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".tex"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".tex"))
                                  //~ }
                                  //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".log"))
                                //~ }
                              //~ )
                            //~ } else {
                              //~ document.getElementById("pdfGenerationLog").value += "\n  Fehler beim Erstellen des Zeugnisses für " + certName + "! Bitte Log im PDF-Zielverzeichnis einsehen."
                              //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".log"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".log"))
                              //~ if (document.getElementById("deleteTeX").checked){
                                //~ if (document.getElementById("deleteTeXDespiteErrors").checked){
                                  //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".tex"))
                                //~ } else {
                                  //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".tex"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".tex"))
                                //~ }
                              //~ } else {
                                //~ fs.renameSync(path.join(tempBaseDir, "temp", certName + ".tex"), path.join(document.getElementById("pdfOutputDirectory_input").value, certName + ".tex"))
                              //~ }
                            //~ }
                            //~ fs.rmSync(path.join(tempBaseDir, "temp", certName + ".aux"))
                          //~ }
                        //~ )
                      //~ } else {
                        //~ document.getElementById("pdfGenerationLog").value += "\nDas genutzte Betriebssystem wird nicht unterstützt und kann keine PDF-Zeugnisse erzeugen."
                      //~ }
                    //~ }
                  //~ }
                //~ }
              //~ )
            //~ }
          //~ )
        //~ }
      //~ }
    //~ }
  //~ )
//~ }


/************
* Calendar. *
************/

function calendar_toggleVisibility(e){
  if (! e.disabled){
    document.getElementById('overlay_calendar').style.visibility = "visible"
    document.getElementById('overlay_calendar').style.opacity = 1
    e.disabled = true
  } else {
    document.getElementById('overlay_calendar').style.visibility = "hidden"
    document.getElementById('overlay_calendar').style.opacity = 0
    e.disabled = ""
  }

  if (document.getElementById('calendarSheet').rows.length == 0){
    calendar_populate()
  }

  let pos = document.getElementById('input_date').getBoundingClientRect();
  document.getElementById('overlay_calendar').style.left = pos.x - 0.5 * document.getElementById('overlay_calendar').offsetWidth + 0.5 * pos.width + "px"
  document.getElementById('overlay_calendar').style.top = pos.y + pos.height + "px";
}


function getNumberFromMonth(name){
  for (let m = 0; m < monthNames.length; m++){
    if (monthNames[m] == name){
      return m + 1
    }
  }
}


function calendar_populate(){
  let year = document.getElementById("overlay_calendar_year").innerText
  let month = getNumberFromMonth(document.getElementById("overlay_calendar_month").innerText) // 1–12

  let firstWeek = getWeekNumber(year + month.toString().padStart(2, '0') + "01")
  // Generate the new table.
  let t = document.createElement('table')

  // Generate the rows for the current month.
  let r = document.createElement('TR')
  let c = document.createElement('TD')
  c.classList.add('calendar_weeknumber')
  r.append(c)

  // Calendar header.
  weekdayNames.forEach(function(v){
    let c = document.createElement('TD')
    c.classList.add('calendar_weekday')
    c.innerText = v
    r.append(c)
  })
  t.append(r)

  r = document.createElement('TR')
  r.classList.add('row_week')
  c = document.createElement('TD')

  // Fill the calendar sheet with blank days for the weekdays of the previous month.
  let tmp = new Date(year, month - 1, 1)
  let firstOfMonth_weekday = (tmp.getDay() + 6) % 7
  // Add the week number to the calendar sheet, if the weekday is not monday.
  if (firstOfMonth_weekday > 0){
    c.innerText = firstWeek
    c.classList.add('calendar_weeknumber')
    r.appendChild(c)
  }
  for (let w = 0; w < firstOfMonth_weekday; w++){
    c = document.createElement('TD')
    r.appendChild(c)
  }

  let checkingDate = new Date(year, month - 1, 1)
  let d = 1
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
    c.innerHTML = '<button type="button" class="calendar_dateButton" onclick="calendar_confirmDate(this)">' + checkingDate.getDate() + '</button>'
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


function calendar_close(e){
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


function calendar_confirmDate(e){
  let day = e.innerText.padStart(2, "0")
  let month = getNumberFromMonth(document.getElementById("overlay_calendar_month").innerText).toString().padStart(2, "0")
  let year = document.getElementById("overlay_calendar_year").innerText
  document.getElementById("input_date").value = day + "." + month + "." + year

  document.getElementById("label_year").innerText = (parseInt(year) - 1).toString() + "/" + year.match(/[0-9]{2}$/)

  SESSION[0].date = document.getElementById("input_date").value
  SESSION[0].year = document.getElementById("label_year").innerText

  updateNamePreviewLabel(document.getElementById("sessionFilesName_input"))

  calendar_close()
}


function calendar_changeYear(e, delta){
  // Delta: -1 = previous year, 1 = next year.
  let year = parseInt(e.parentNode.parentNode.parentNode.rows[0].cells[1].innerText)
  e.parentNode.parentNode.parentNode.rows[0].cells[1].innerText = (year + delta).toString()
  calendar_populate()
}


function calendar_changeMonth(e, delta){
  // Delta: -1 = previous month, 1 = next month.
  for (let m = 0; m < monthNames.length; m++){
    if (monthNames[m] == document.getElementById("overlay_calendar_month").innerText){
      // More general approach: if ((m + delta + 12) % 12 == 0){ … }.
      if (m == 0 && delta == -1 || m == 11 && delta == 1){
        let year = parseInt(document.getElementById("overlay_calendar_year").innerText)
        document.getElementById("overlay_calendar_year").innerText = (year + delta).toString()
      }
      // Add 12 to delta to overcome a Javascript bug: -1 modulo 12 is 11, but Javascript returns -1.
      document.getElementById("overlay_calendar_month").innerText = monthNames[(m + delta + 12) % 12]
      break
    }
  }
  calendar_populate()
}


function prompt_mergeImport_close(e){
  let canvas = ""
  if (e){
    canvas = e.parentNode.parentNode
  } else {
    canvas = document.getElementById("overlay_infocanvas")
  }
  canvas.style.opacity = 0
  document.getElementById("overlay_background").style.opacity = 0
  setTimeout(
    function(){
      canvas.style.visibility = "hidden"
      document.getElementById("overlay_background").style.visibility = "hidden"
    },
    750
  )
}


function fillSessionFileInput(e){
  e.parentNode.parentNode.cells[0].children[0].value = e.files[0].name
  document.getElementById("overlay_certGeneration").style.height = document.getElementById("overlay_certGeneration").dataset.heightFull + "px"
  document.getElementById("overlay_certGeneration").style.top = 0.5 * window.innerHeight - 0.5 * document.getElementById("overlay_certGeneration").dataset.heightFull + "px"
  setTimeout(
    function(){
      document.getElementById("overlay_certGeneration_explaination").style.visibility = "visible"
      document.getElementById("overlay_certGeneration_button_generate").style.visibility = "visible"
      document.getElementById("overlay_certGeneration_explaination").style.opacity = 1
      document.getElementById("overlay_certGeneration_button_generate").style.opacity = 1
    },
    1000
  )
}
