import { I18nLocalizer } from "../index.js";
import { SourceLocation } from "../parser/SourceRange.js";

export enum AiTypeErrorKind {
  AlreadyDeclaredVariable,
  NotAssignableType,
  CanNotCall,
  MissingArgumentError,
  InvalidArgumentError,
  CanNotAssignToImmutableVariable,
}

export class AiTypeError extends Error {
  constructor(public kind: AiTypeErrorKind, public location: SourceLocation) {
    super(AiTypeErrorKind[kind]);
  }
}

export class AiAlreadyDeclaredVariableError extends AiTypeError {
  constructor(public name: string, location: SourceLocation) {
    super(AiTypeErrorKind.AlreadyDeclaredVariable, location);
  }
}

export class AiNotAssignableTypeError extends AiTypeError {
  constructor(
    public left: string,
    public right: string,
    location: SourceLocation
  ) {
    super(AiTypeErrorKind.NotAssignableType, location);
  }
}

export class AiCanNotCallError extends AiTypeError {
  constructor(public type: string, location: SourceLocation) {
    super(AiTypeErrorKind.CanNotCall, location);
  }
}

export class AiMissingArgumentError extends AiTypeError {
  constructor(
    public pos: number,
    public expectType: string,
    location: SourceLocation
  ) {
    super(AiTypeErrorKind.MissingArgumentError, location);
  }
}

export class AiInvalidArgumentError extends AiTypeError {
  constructor(
    public pos: number,
    public expectType: string,
    public butType: string,
    location: SourceLocation
  ) {
    super(AiTypeErrorKind.InvalidArgumentError, location);
  }
}

export class AiCanNotAssignToImmutableVariableError extends AiTypeError {
  constructor(public name: string, location: SourceLocation) {
    super(AiTypeErrorKind.CanNotAssignToImmutableVariable, location);
  }
}
