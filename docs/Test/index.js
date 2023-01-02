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

const asyncSequence = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Containers/Test/Sequence.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

(async function () {
  try {
    const modules = await Promise.all( [ asyncWindow, asyncErrorLog, asyncTypes, asyncStreams, asyncUnicode, asyncTasks, asyncMemory, asyncSequence ] );
    start(modules);
  } catch (e) {
    console.error(e);
  }
})();


async function start( [ evtWindow, ErrorLog, Types, Streams, Unicode, Tasks, Memory, Sequence ] ) {
  const utf8Decode = new Streams.Transform();
  utf8Decode.init = function () {
    const state = {};
    state.value = 0;
    state.contBytes = 0;
    state.inputView = null;
    state.inputIndex = 0;
    return state;
  }
  utf8Decode.execute = function (args) {
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
        console.log("pulse");
        // inputView is a Memory.View
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
  utf8Decode.flush = function (args) {
    const { state } = (function () {
      let ret = {};
      if (!("state" in args)) {
        throw "Argument \"state\" must be provided.";
      }
      ret.state = args.state;
      return ret;
    })();
    return null;
  };
  const utf8Encode = new Streams.TransformToByte();
  utf8Encode.init = function () {
    const state = {};
    state.holdBytes = [];
    return state;
  };
  utf8Encode.execute = function (args) {
    try {
      const { inputItem, outputView, state } = (function () {
        let ret = {};
        if ("input" in args) {
          ret.inputItem = args.input;
        } else {
          ret.inputItem = null;
        }
        if (!("output" in args)) {
          throw "Argument \"output\" must be provided.";
        }
        ret.outputView = args.output;
        if (!("state" in args)) {
          throw "Argument \"state\" must be provided.";
        }
        ret.state = args.state;
        return ret;
      })();
      const outputArray = new Memory.DataArray({
        memoryView: outputView,
        ElementClass: Memory.Uint8,
      });
      let bytesWritten = 0;
      function writeByte(value) {
        console.log(value.toString(16))
        if (bytesWritten < outputArray.length) {
          outputArray.at(bytesWritten).set(value);
          ++bytesWritten;
        } else {
          state.holdBytes.push(value);
        }
      }
      while ((state.holdBytes.length !== 0) && (bytesWritten <= outputArray.length)) {
        outputArray.at(bytesWritten).set(state.holdBytes.shift());
        ++bytesWritten;
      }
      if (inputItem !== null) {
        console.log(inputItem);
        // inputItem is a Unicode.CodePoint
        const codePoint = inputItem.valueOf();
        console.log(codePoint.toString(16));
        if ((codePoint & 0xFFFF80) === 0) {
          // Use 1 byte to encode 7 bits
          writeByte(codePoint);
        } else if ((codePoint & 0xFFF800) === 0) {
          // Use 2 bytes to encode 11 bits
          writeByte((codePoint >> 6) | 0xC0);
          writeByte((codePoint & 0x3F) | 0x80);
        } else if ((codePoint & 0xFF0000) === 0) {
          // Use 3 bytes to encode 16 bits
          writeByte((codePoint >> 12) | 0xE0);
          writeByte(((codePoint >> 6) & 0x3F) | 0x80);
          writeByte((codePoint & 0x3F) | 0x80);
        } else {
          // Use 4 bytes to encode 21 bits
          writeByte((codePoint >> 18) | 0xF0);
          writeByte(((codePoint >> 12) & 0x3F) | 0x80);
          writeByte(((codePoint >> 6) & 0x3F) | 0x80);
          writeByte((codePoint & 0x3F) | 0x80);
        }
      }
      return bytesWritten;
    } catch (e) {
      ErrorLog.rethrow({
        functionName: "utf8Encode",
        error: e,
      });
    }
  }
  utf8Encode.flush = function (args) {
    const { outputView, state } = (function () {
      let ret = {};
      if (!("output" in args)) {
        throw "Argument \"output\" must be provided.";
      }
      ret.outputView = args.output;
      if (!("state" in args)) {
        throw "Argument \"state\" must be provided.";
      }
      ret.state = args.state;
      return ret;
    })();
    return 0;
  };
  try {
    const imgBird = document.createElement("img");
    imgBird.src = "FlappingBird.gif";
    imgBird.style.width = "200px";
    document.body.appendChild(imgBird);
    document.body.appendChild(document.createElement("br"));
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    document.body.appendChild(fileInput);
    const inpByteRate = document.createElement("input");
    inpByteRate.type = "number";
    document.body.appendChild(inpByteRate);
    const textOutput = document.createElement("textarea");
    document.body.appendChild(textOutput);
    let byteRate;

    const outputByteSequence = new Sequence.ByteSequence();
    const utf8Encoder = new Streams.PassiveNodeToByte({
      transform: utf8Encode,
      outputByteRate: 5,
    });
    utf8Encoder.connectOutput(outputByteSequence.inputCallback);
    const utf8Decoder = new Streams.PassiveNode({
      transform: utf8Decode,
    });
    utf8Decoder.connectOutput(utf8Encoder.inputCallback);
    const doneCallback = new Tasks.Callback({
      invoke: function () {
        console.log("utf8Encoder flushed");
        const outputView = outputByteSequence.createView();
        const outputBlob = new Blob( [ outputView.toUint8Array() ] );
        const outputURL = URL.createObjectURL(outputBlob);
        const a = document.createElement("a");
        a.display = "none";
        a.href = outputURL;
        a.download = "output.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log("done");
      }
    });

    utf8Decoder.flushedSignal.add(new Tasks.Callback({
      invoke: function () {
        console.log("utf8Decoder flushed");
        utf8Encoder.flush();
      },
    }));
    utf8Encoder.flushedSignal.add(doneCallback);

    fileInput.addEventListener("input", function (evt) {
      byteRate = parseInt(inpByteRate.value);
      const file = evt.target.files[0];
      const fileChunkPushSource = new Streams.BlobChunkPushSource({
        blob: file,
        outputByteRate: byteRate,
      });
      fileChunkPushSource.connectOutput(utf8Decoder.inputCallback);
      fileChunkPushSource.eofSignal.add(new Tasks.Callback({
        invoke: function () {
          console.log("eof");
          utf8Decoder.flush();
        },
      }));
    });
  } catch (e) {
    ErrorLog.rethrow({
      functionName: "start",
      error: e,
    });
  }
}
