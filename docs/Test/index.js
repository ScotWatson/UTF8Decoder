/*
(c) 2022 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();

const asyncWindow = new Promise(function (resolve, reject) {
  window.addEventListener("load", function (evt) {
    resolve(evt);
  });
});

const asyncErrorLog = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/Test/ErrorLog.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncTypes = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/Test/Types.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncStreams = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Streams/Test/Streams.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncUnicode = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Unicode/Test/Unicode.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncTasks = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Tasks/Test/Tasks.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncMemory = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Memory/Test/Memory.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

(async function () {
  try {
    const modules = await Promise.all( [ asyncWindow, asyncErrorLog, asyncTypes, asyncStreams, asyncUnicode, asyncTasks, asyncMemory ] );
    start(modules);
  } catch (e) {
    console.error(e);
  }
})();


async function start( [ evtWindow, ErrorLog, Types, Streams, Unicode, Tasks, Memory ] ) {
  const utf8DecodeInit = {
    value: 0,
    contBytes: 0,
    inputView: null,
    inputIndex: 0,
  };
  function utf8Decode(args) {
    const { inputView, state } = (function () {
      let ret = {};
      if ("input" in args) {
        ret.inputView = args.input;
      } else {
        ret.inputView = null;
      }
      if (!("state" in args)) {
        throw "Argument \"state\" must be provided.";
      }
      ret.state = args.state;
      return ret;
    })();
    try {
      if (inputView !== null) {
        // inputView is a Memory.View
        console.log("pulse");
        if (state.inputView === null) {
          state.inputView = inputView;
          state.inputIndex = 0;
        } else {
          const oldDataView = state.inputView.createSlice({
            byteOffset: state.inputIndex,
          });
          const newInputBlock = new Memory.Block({
            byteLength: oldDataView.byteLength + inputView.byteLength,
          });
          state.inputView = new Memory.View(newInputBlock);
          const oldDataDest = state.inputView.createSlice({
            byteOffset: 0,
            byteLength: oldDataView.byteLength,
          });
          const newDataDest = state.inputView.createSlice({
            byteOffset: oldDataView.byteLength,
          });
          oldDataDest.set(oldDataView);
          newDataDest.set(inputView);
          state.inputIndex = 0;
        }
      }
      if (state.inputView === null) {
        return null;
      }
      const inputArray = new Memory.DataArray({
        memoryView: state.inputView,
        ElementClass: Memory.Uint8,
      });
      while (state.inputIndex < inputArray.length) {
        const byteValue = inputArray.at(state.inputIndex).valueOf();
        ++state.inputIndex;
        if (state.contBytes === 0) {
          if (byteValue < 0x80) {
            state.value = 0;
            return new Unicode.CodePoint(byteValue);
          } else if ((byteValue & 0xE0) === 0xC0) {
            state.value = (byteValue & 0x1F);
            state.contBytes = 1;
          } else if ((byteValue & 0xF0) === 0xE0) {
            state.value = (byteValue & 0x0F);
            state.contBytes = 2;
          } else if ((byteValue & 0xF8) === 0xF0) {
            state.value = (byteValue & 0x07);
            state.contBytes = 3;
          } else {
            // Invalid byte, return Replacement Character
            return new Unicode.CodePoint(0xFFFD);
          }
        } else {
          if ((byteValue & 0xC0) !== 0x80) {
            // Invalid byte, return Replacement Character
            state.contBytes = 0;
            return new Unicode.CodePoint(0xFFFD);
          }
          state.value <<= 6;
          state.value |= (byteValue & 0x3F);
          --state.contBytes;
          if (state.contBytes === 0) {
            if (state.value > 0x10FFFF) {
              return new Unicode.CodePoint(0xFFFD);
            } else {
              return new Unicode.CodePoint(state.value);
            }
          }
        }
      }
      state.inputIndex = 0;
      state.inputView = null;
      return null;
    } catch (e) {
      ErrorLog.rethrow({
        functionName: "utf8Decode",
        error: e,
      });
    }
  }
  try {
    const imgBird = document.createElement("img");
    imgBird.src = "FlappingBird.gif";
    imgBird.style.width = "200px";
    document.body.appendChild(imgBird);
    document.body.appendChild(document.createElement("br"));
    const utf8Decoder = new Streams.PassiveTransform({
      transform: utf8Decode,
      state: utf8DecodeInit,
    });
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    document.body.appendChild(fileInput);
    const textOutput = document.createElement("textarea");
    document.body.appendChild(textOutput);
    const textSink = new Tasks.CallbackController({
      invoke: function (item) {
        textOutput.value += item.toString();
      },
    });
    fileInput.addEventListener("input", function (evt) {
      const file = evt.target.files[0];
      const fileChunkPushSource = new Streams.BlobChunkPushSource({
        blob: file,
        outputByteRate: 0x200,
      });
      fileChunkPushSource.connectOutput(utf8Decoder.inputCallback);
    });
    utf8Decoder.connectOutput(textSink.callback);
  } catch (e) {
    ErrorLog.rethrow({
      functionName: "start",
      error: e,
    });
  }
}
