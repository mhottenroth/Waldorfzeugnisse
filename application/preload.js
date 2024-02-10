const {ipcRenderer} = require('electron')
const path = require("path")

window.addEventListener('DOMContentLoaded', () => {
  let a = document.getElementById("button_saveSession")
  a.addEventListener("click",
    () => {
      let targetFilePath = path.join(document.getElementById("sessionFilesDirectory_input").value, document.getElementById("sessionFilesName_namePreviewLabel").innerText)
      try {
        fs.writeFileSync(targetFilePath, JSON.stringify(SESSION, null, 2), 'utf-8')
        fs.stat(targetFilePath,
          (err, stats) => {
            let modTime = stats.mtime.getHours().toString().padStart(2, "0") + ":" +
              stats.mtime.getMinutes().toString().padStart(2, "0") + ":" +
              stats.mtime.getSeconds().toString().padStart(2, "0") + " Uhr, " + 
              stats.mtime.getDate().toString().padStart(2, "0") + "." + 
              stats.mtime.getMonth().toString().padStart(2, "0") + "." +
              stats.mtime.getFullYear().toString()
            document.getElementById("latestSaveTime").innerText = modTime
            updateSessionFilesList("", document.getElementById("sessionFilesDirectory_input").value)
          }
        )
      } catch(e) {
        document.getElementById("latestSaveTime").innerText = "Speichern fehlgeschlagen!"
      }
    }
  )
})

process.once('loaded', () => {
  window.addEventListener('message',
    evt => {
      if (evt.data.type === 'select-dirs') {
        ipcRenderer.send('select-dirs')
      }
      if (evt.data.type === 'select-pdf-dir') {
        ipcRenderer.send('select-pdf-dir')
      }
      if (evt.data.type === 'generate-pdf') {
        ipcRenderer.send('generate-pdf')
      }
    }
  )
})
