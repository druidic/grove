/* sample OS to test that the Grove is working */
var keys = {}
var text = ''
function main(event, dataRecorder) {
  var toSave = {}
  if (event.type === 'startup') {
    text = dataRecorder.read('myfile')
    return systemBar('Start typing! Text is saved when you press ENTER.')
      .concat(cursor(text).split('\n'))
  }

  if (event.type === 'keyDown') {
    keys[event.key] = true
    switch (event.key) {
      case 13:
        // enter
        text += '\n'
        toSave['myfile'] = text
        break
      case 8:
        // backspace
        text = text.slice(0, text.length - 1)
        break
      case 192:
        // tilde
        // test that we can recover from an infinite loop
        while (true) {}
      default:
        text += String.fromCharCode(event.key)
    }
  }

  if (event.type === 'keyUp') {
    delete keys[event.key]
  }

  var eventOutput =
    '' + event.type + ' ' + Object.keys(keys).join(', ')
  return {
    screen: systemBar(eventOutput)
      .concat(cursor(text).split('\n')),
    records: toSave
  }
}

function systemBar(string) {
  var style = {
    fg: 'black',
    bg: 'goldenrod',
    b: 1
  }

  return [LineBuffer(string, style)]
}

function cursor(string) {
  return string + '\u2592'
}