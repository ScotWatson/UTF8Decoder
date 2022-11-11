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
    const module = await import("https://scotwatson.github.io/Debug/20221107/ErrorLog.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncTypes = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/20221107/Types.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncStreams = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Streams/20221107/Streams.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncUnicode = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Unicode/20221110/Unicode.mjs");
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
  async function utf8decode(input) {
    try {
      let value;
      let contBytes = 0;
      let state = 0;
      if (!(Types.isInteger(input))) {
        throw "input must be an integer.";
      }
      switch (state) {
        case 0: // First byte
          if (input < 0x80) {
            value = 0;
            return new Unicode.CodePoint(input);
          } else if ((input & 0xE0) === 0xC0) {
            value = (input & 0x1F);
            contBytes = 1;
            state = 1;
          } else if ((input & 0xF0) === 0xE0)) {
            value = (input & 0x0F);
            contBytes = 2;
            state = 1;
          } else if ((input & 0xF8) === 0xF0) {
            value = (input & 0x07);
            contBytes = 3;
            state = 1;
          } else {
            // Invalid byte, return Replacement Character
            return new Unicode.CodePoint(0xFFFD);
          }
          state = 1;
          break;
        case 1: // Continuation Byte
          if ((input & 0xC0) !== 0xF0) {
            // Invalid byte, return Replacement Character
            contBytes = 0;
            state = 0;
            return new Unicode.CodePoint(0xFFFD);
          }
          value <<= 6;
          value |= (input & 0x3F);
          --contBytes;
          if (contBytes === 0) {
            state = 0;
          }
          break;
        default:
          throw "Internal Logic Error: Invalid state value";
      };
    } catch (e) {
      ErrorLog.rethrow({
        functionName: "utf8decode",
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
    const underlyingSource = {
      start: function (controller) {
        return;
      },
      pull: function (controller) {
        const item = Math.random();
        controller.enqueue(item);
        return;
      },
      cancel: function (reason) {
        return;
      },
    };
    const readQueuingStrategy = {
      highWaterMark: 1,
      size: function (chunk) {
        return 1;
      }
    };
    const readableStream = new self.ReadableStream(underlyingSource, readQueuingStrategy);
    const readableStreamSource = new Streams.ReadableStreamSource(readableStream);
    const underlyingSink = {
      start: function (controller) {
      },
      write: function (chunk, controller) {
        console.log(chunk);
      },
      close: function (controller) {
      },
      abort: function (reason) {
      },
    };
    const writeQueuingStrategy = {
      highWaterMark: 1,
    }
    const writableStream = new self.WritableStream(underlyingSink, writeQueuingStrategy);
    const writableStreamSink = new Streams.WritableStreamSink(writableStream);
    const pump = new Streams.Pump();
    pump.setSource(readableStreamSource);
    pump.registerSink(writableStreamSink);
    (function execute() {
      const start = performance.now();
      pump.execute();
      const end = performance.now();
      setTimeout(execute, 0);
    })();
  } catch (e) {
    ErrorLog.rethrow({
      functionName: "start",
      error: e,
    });
  }
}
