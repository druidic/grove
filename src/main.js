;(function() {
"use strict"

var $ = document.querySelectorAll.bind(document)

// --- DOM elements ---------------------------------------

var $diskSlot = $('#slot')[0]
var $powerSwitch = $('#power-switch')[0]
var $recordsScript = $('#records')[0]
var $groveWorkerScript = $('#grove-worker')[0]
var $modalOverlay = $('#overlay')[0]
var $hideDataEditorButton = $('#data-record-modal .close-button button')[0]
var $showDataEditorButton = $('#data-editor-button')[0]
var $entryNameInput = $('#data-record-modal .data-record-selector input')[0]
var $entryContentInput = $('#data-record-modal textarea')[0]
var $dataEditorSaveButton = $('#data-record-modal .save')[0]
var $title = $('head title')[0]

// --- Initial state --------------------------------------

var dataRecords = RECORDS
var lastSaveTimestamp = +(new Date())
var groveWorker = GroveWorker(
  dataRecords,
  handleMessageFromWorker)
var urlToOpen = null

setTitleTo(getComputerName(dataRecords))

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

click($showDataEditorButton, function() {
  $modalOverlay.style.display = 'block';
  $entryNameInput.focus()
})

click($hideDataEditorButton, function() {
  $modalOverlay.style.display = 'none';
})

click($dataEditorSaveButton, function() {
  var name    = $entryNameInput.value
  var content = $entryContentInput.value

  if (!name) return

  dataRecords[name] = content

  groveWorker.postMessage({
    type: 'updateDataRecord',
    name: name,
    content: content
  })
})

click($powerSwitch, function() {
  if (groveWorker) {
    // turn off
    groveWorker.terminate()
    groveWorker = null
    redraw([], true)
  } else {
    // turn on
    groveWorker = GroveWorker(dataRecords, handleMessageFromWorker)
  }
})

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
  }

  setTimeout(function() {
    if (urlToOpen) {
      window.open(urlToOpen, '_blank')
    }
    urlToOpen = null
  }, 250)
})

window.addEventListener('keyup', function(e) {
  if (groveCanReceiveKeyEvents()) {
    e.preventDefault()
    groveWorker.postMessage({type: 'keyUp', event: {keyCode: e.keyCode}})
  }
})

// --- Function definitions -------------------------------

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
function redraw(text, force) {
  var lineElements = $('#terminal p')
  for (var i = 0; i < lineElements.length; i++) {
    var toDraw = text[i] || ''
    if (force || toDraw !== previouslyDrawn[i]) {
      lineElements[i].innerHTML = toDraw
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
