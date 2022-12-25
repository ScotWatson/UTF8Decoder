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

(async function () {
  try {
    const modules = await Promise.all( [ asyncWindow, asyncErrorLog, asyncTypes, asyncStreams, asyncUnicode ] );
    start(modules);
  } catch (e) {
    console.error(e);
  }
})();


async function start( [ evtWindow, ErrorLog, Types, Streams, Unicode ] ) {
  const utf8DecodeInit = {
    value: 0,
    contBytes: 0,
  };
  function utf8Decode(args) {
    const { inputView, state } = (function () {
      let ret = {};
      if ("input" in args) {
        ret.inputView = args.input;
      } else {
        ret.inputView = null;
      }
      ret.state = args.state;
      return ret;
    })();
    try {
      if (inputView === null) {
        return null;
      }
      if (!(inputView instanceof Memory.View)) {
        throw "input must be a Memory.View.";
      }
      const inputArray = new Memory.DataArray({
        memoryView: inputView,
        ElementClass: Memory.Uint8,
      });
      let inputIndex = 0;
      while (inputIndex < inputArray.length) {
        const byteValue = inputArray.at(inputIndex).valueOf();
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
        }
      }
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
      const readableStream = file.stream();
      const readableStreamSourceController = new Streams.ReadableByteStreamPushSource({
        readableStream: readableStream,
        chunkSize: 128,
      });
      readableStreamSourceController.connectOutput(utf8Decoder.inputCallback);
      utf8Decoder.connectOutput(textSink);
      (function execute() {
        readableStreamSourceController.execute();
        self.setTimeout(execute, 0);
      })();
    });
  } catch (e) {
    ErrorLog.rethrow({
      functionName: "start",
      error: e,
    });
  }
}
