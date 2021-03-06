;(function() {

var $ = document.querySelectorAll.bind(document)

// --- DOM elements ---------------------------------------

var $display = $('#display')[0]
var $diskSlot = $('#slot')[0]
var $powerSwitch = $('#power-switch')[0]
var $recordsScript = $('#records')[0]
var $groveWorkerScript = $('#grove-worker')[0]
var $modalOverlay = $('#overlay')[0]
var $hideDataLoaderButton = $('#load-data-modal .close-button button')[0]
var $showDataLoaderButton = $('#load-data-button')[0]
var $recordNameInput = $('#load-data-modal .data-record-selector input')[0]
var $recordContentInput = $('#load-data-modal textarea')[0]
var $dataEditorSaveButton = $('#load-data-modal .save')[0]
var $title = $('head title')[0]

// --- Initial state --------------------------------------

var dataRecords = RECORDS
var lastSaveTimestamp = +(new Date())
var urlToOpen = null
var contentToDisplayInNewWindow = null
var groveWorker = null

setTitleTo(getComputerName(dataRecords))

togglePower()

// --- Event handler setup --------------------------------

click($diskSlot, function() {
  $recordsScript.textContent
    = 'var RECORDS = ' + JSON.stringify(dataRecords)

  var now = new Date()
  var pageData = document.documentElement.outerHTML
  var blob = new Blob([pageData], {type: 'text/html'})
  var computerName = getComputerName(dataRecords)
  saveAs(blob, QuineFilename(computerName, now))
  lastSaveTimestamp = +now
})

click($showDataLoaderButton, function() {
  $modalOverlay.style.display = 'block';
  $recordNameInput.focus()
})

click($hideDataLoaderButton, function() {
  $modalOverlay.style.display = 'none';
})

click($dataEditorSaveButton, function() {
  var name    = $recordNameInput.value
  var content = $recordContentInput.value

  if (!name) return

  dataRecords[name] = content

  groveWorker.postMessage({
    type: 'updateDataRecord',
    name: name,
    content: content
  })
})

click($powerSwitch, togglePower)

window.addEventListener('beforeunload', function(e) {
  if (shouldWarnAboutUnsavedChanges()) {
    // This message isn't shown in Chrome but it might be in other browsers.
    return e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
  }
})

window.addEventListener('keydown', function(e) {
  if (groveCanReceiveKeyEvents()) {
    e.preventDefault()
    groveWorker.postMessage({type: 'keyDown', event: {keyCode: e.keyCode}})

    setTimeout(function() {
      if (urlToOpen) {
        window.open(urlToOpen, '_blank')
      }
      urlToOpen = null

      if (contentToDisplayInNewWindow) {
        var newWindow = window.open('', '_blank')
        newWindow.document.open()
        newWindow.document.write(contentToDisplayInNewWindow)
        newWindow.document.close()
      }
      contentToDisplayInNewWindow = null
    }, 250)
  }
})

window.addEventListener('keyup', function(e) {
  if (groveCanReceiveKeyEvents()) {
    e.preventDefault()
    groveWorker.postMessage({type: 'keyUp', event: {keyCode: e.keyCode}})
  }
})

// --- Function definitions -------------------------------

function togglePower () {
  urlToOpen = null
  contentToDisplayInNewWindow = null
  if (groveWorker) {
    // turn off
    groveWorker.terminate()
    groveWorker = null
    $display.setAttribute('class', '')
    redraw([], true)
  } else {
    // turn on
    $display.setAttribute('class', 'power-on')
    groveWorker = GroveWorker(
      dataRecords,
      handleMessageFromWorker)
  }
}

function handleMessageFromWorker(msg) {
  switch (msg.data.type) {
    case 'redraw':
      redraw(msg.data.value)
      break
    case 'dataRecordChange':
      dataRecords[msg.data.name] = msg.data.content
      setTitleTo(getComputerName(dataRecords))
      break
    case 'openUrl':
      urlToOpen = urlToOpen || msg.data.url
      break
    case 'displayInNewWindow':
      contentToDisplayInNewWindow
        = contentToDisplayInNewWindow || msg.data.content
  }
}

function GroveWorker(dataRecords, messageCallback) {
  var scriptBlob = new Blob([
    'var RECORDS = ',
    JSON.stringify(dataRecords),
    ';',
    $groveWorkerScript.textContent
  ])

  var worker = new Worker(URL.createObjectURL(scriptBlob))
  worker.addEventListener('message', messageCallback)
  return worker
}

function click(elem, callback) {
  elem.addEventListener('click', callback)
}

function setTitleTo(title) {
  $title.textContent = title
}

var previouslyDrawn = []
var lineElements = $('#display p')
function redraw(text, force) {
  for (var i = 0; i < lineElements.length; i++) {
    var toDraw = text[i] || ''
    if (force || toDraw !== previouslyDrawn[i]) {
      lineElements[i].innerText = toDraw
      previouslyDrawn[i] = toDraw
    }
  }
}

function groveCanReceiveKeyEvents() {
  return groveWorker
    && $modalOverlay.style.display !== 'block'
    // if the modal is shown, don't let the Grove handle
    // key events since the user probably wants to type
    // in the form fields.
}

function createFilename(computerName) {
  var date = new Date()
  return computerName + '-' + formatDateForFilename(date)
}

function shouldWarnAboutUnsavedChanges() {
  return isNavigationWarningEnabled() && userHasntSavedInAWhile()
}

function userHasntSavedInAWhile() {
  return +(new Date()) - lastSaveTimestamp > 30 * 1000
}

function isNavigationWarningEnabled() {
  return !dataRecords['doNotWarnAboutUnsavedChanges']
}

})();
