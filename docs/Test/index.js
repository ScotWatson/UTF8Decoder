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
  const utf8SequencerInit = {
    currentView: null,
  };
  function utf8Sequencer(input, state) {
    if (input !== null) {
      if (!(input instanceof Memory.View)) {
        throw "input must be a Memory.View.";
      }
      state.currentView = input;
    }
    const thisView = state.currentView.createSlice({
      byteOffset: 0,
      byteLength: 1,
    });
    const value = new Memory.Uint8({
      memoryView: thisView,
    });
    state.currentView = state.currentView.createSlice({
      byteOffset: 1,
    });
    return value.valueOf();
  }
  const utf8DecodeInit = {
    value: 0,
    contBytes: 0,
  };
  function utf8Decode(input, state) {
    try {
      if (input === null) {
        if (currentView
        return null;
      }
      if (!(input instanceof Memory.View)) {
        throw "input must be a Memory.View.";
      }
      state.currentView = input;
      
      if (state.contBytes === 0) {
        if (input < 0x80) {
          state.value = 0;
          return new Unicode.CodePoint(input);
        } else if ((input & 0xE0) === 0xC0) {
          state.value = (input & 0x1F);
          state.contBytes = 1;
        } else if ((input & 0xF0) === 0xE0) {
          state.value = (input & 0x0F);
          state.contBytes = 2;
        } else if ((input & 0xF8) === 0xF0) {
          state.value = (input & 0x07);
          state.contBytes = 3;
        } else {
          // Invalid byte, return Replacement Character
          return new Unicode.CodePoint(0xFFFD);
        }
      } else {
        if ((input & 0xC0) !== 0x80) {
          // Invalid byte, return Replacement Character
          state.contBytes = 0;
          return new Unicode.CodePoint(0xFFFD);
        }
        state.value <<= 6;
        state.value |= (input & 0x3F);
        --state.contBytes;
      }
    } catch (e) {
      ErrorLog.rethrow({
        functionName: "utf8Decode",
        error: e,
      });
    }
  }
  class PassiveTransform {
    #inputPushSink;
    #outputPushSourceController;
    #cycle;
    #state;
    constructor(args) {
      try {
        if (!(Types.isSimpleObject(args))) {
          throw "Argument must be a simple object.";
        }
        if (!(Object.hasOwn(args, "cycle"))) {
          throw "Argument \"cycle\" must be provided.";
        }
        this.#cycle = args.cycle;
        if (Object.hasOwn(args, "initState")) {
          this.#state = args.initState;
        } else {
          this.#state = {};
        }
        this.#inputPushSink = new Streams.PushSink({
          push: this.#execFunc,
        });
        this.#outputPushSourceController = new Streams.PushSourceController();
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "PassiveTransform constructor",
          error: e,
        });
      }
    }
    get input() {
      return this.#inputPushSink;
    }
    get output() {
      return this.#outputPushSourceController.source;
    }
    #execute(input) {
      try {
        let output;
        while (output !== null) {
          output = this.#cycle(null, this.#state);
          this.#outputPushSourceController.execute({
            item: output,
          });
        }
        output = this.#cycle(input, this.#state);
        this.#outputPushSourceController.execute({
          item: output,
        });
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "PassiveTransform.#execute",
          error: e,
        });
      }
    }
  };
  class LazyTransform {
    #inputPullSinkController;
    #outputPullSource;
    #cycle;
    #state;
    constructor(args) {
      try {
        if (!(Types.isSimpleObject(args))) {
          throw "Argument must be a simple object.";
        }
        if (!(Object.hasOwn(args, "cycle"))) {
          throw "Argument \"cycle\" must be provided.";
        }
        this.#cycle = args.cycle;
        if (Object.hasOwn(args, "initState")) {
          this.#state = args.initState;
        } else {
          this.#state = {};
        }
        this.#inputPullSinkController = new Streams.PullSinkController();
        this.#outputPullSource = new Streams.PullSource({
          pull: this.#execFunc,
        });
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "LazyTransform constructor",
          error: e,
        });
      }
    }
    get input() {
      return this.#inputPullSinkController.sink;
    }
    get output() {
      return this.#outputPullSource;
    }
    #execute() {
      try {
        let output = this.#cycle(null, this.#state);
        if (output !== null) {
          return output;
        } else {
          const input = this.#inputPullSinkController.execute();
          output = this.#cycle(input, this.#state);
          return output;
        }
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "LazyTransform.#execute",
          error: e,
        });
      }
    }
  };
  try {
    const imgBird = document.createElement("img");
    imgBird.src = "FlappingBird.gif";
    imgBird.style.width = "200px";
    document.body.appendChild(imgBird);
    document.body.appendChild(document.createElement("br"));
    const utf8Decoder = new PassiveTransform({
      initState: utf8DecodeInit,
      cycle: utf8Decode,
    });
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    document.body.appendChild(fileInput);
    const textOutput = document.createElement("textarea");
    document.body.appendChild(textOutput);
    const textSink = new Streams.PushSink({
      push: function (item) {
        textOutput.value += item.toString();
      },
    });
    fileInput.addEventListener("input", function (evt) {
      const file = evt.target.files[0];
      const readableStream = file.stream();
      const readableStreamSourceController = new Streams.ReadableByteStreamPushSourceController({
        readableStream: readableStream,
        chunkSize: 128,
      });
      readableStreamSourceController.source.registerSink(utf8Decoder.input);
      utf8Decoder.output.registerSink(textSink);
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
