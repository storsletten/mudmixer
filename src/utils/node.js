const path = require('path');

module.exports = main => {
 const exports = main.exports;

 const callers = ({
  limit = 10,
  simplify = false,
 } = {}) => {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  const oldStackTraceLimit = Error.stackTraceLimit;
  Error.prepareStackTrace = (error, structuredStackTrace) => structuredStackTrace;
  Error.stackTraceLimit = limit + 2;
  const stack = (new Error()).stack.slice(2);
  Error.prepareStackTrace = oldPrepareStackTrace;
  Error.stackTraceLimit = oldStackTraceLimit;
  if (simplify) {
   for (let i=0; i<stack.length; i++) {
    const callSite = stack[i];
    const functionName = callSite.getFunctionName();
    if (!functionName) {
     stack.length = i;
     break;
    }
    stack[i] = {
     functionName,
     fileName: callSite.getFileName(),
     lineNumber: callSite.getLineNumber(),
     columnNumber: callSite.getColumnNumber(),
     callSite,
    };
   }
  }
  return stack;
 };

 const requireFile = fileName => {
  const resolvedPath = require.resolve(path.isAbsolute(fileName) ? fileName : path.join(path.dirname(callers({ limit: 1 })[0].getFileName()), fileName));
  if (resolvedPath in require.cache) delete require.cache[resolvedPath];
  return require(resolvedPath);
 };

 return {
  callers,
  require: requireFile,
 };
};
