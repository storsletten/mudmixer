module.exports = main => {
 const exports = main.exports;

 class Suspend extends exports.Action {
  constructor(options) {
   super(options);
   const minTimeMs = 1;
   const { middleware } = options;
   let { timeMs } = options;
   if (typeof timeMs !== 'number') {
    const { time } = options;
    if (!time) timeMs = minTimeMs;
    else if (typeof time === 'number') timeMs = time;
    else if (time instanceof Date) timeMs = (time - Date.now());
    else {
     timeMs = parseInt(time);
     if (isNaN(timeMs)) timeMs = minTimeMs;
    }
   }
   this.timeoutHandle = setTimeout(() => this.resolve(), Math.max(minTimeMs, timeMs));
  }

  cleanup() {
   clearTimeout(this.timeoutHandle);
   this.timeoutHandle = undefined;
  }
 }

 exports.Suspend = Suspend;
};
