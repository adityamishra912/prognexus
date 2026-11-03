import { Readable } from "stream";

//#region src/utils/pipe-stdin.d.ts

interface StdinPipe {
  /**
   * Resolves once the stream has ended and stdin is closed, or once the
   * command stops accepting input. Rejects if a write fails or the stream
   * errors.
   */
  done: Promise<void>;
  /**
   * Stops reading the stream, for when the command has exited.
   */
  stop(): void;
}
//#endregion
export { StdinPipe };
//# sourceMappingURL=pipe-stdin.d.ts.map