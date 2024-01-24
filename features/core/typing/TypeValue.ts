import { Ast } from "@syuilo/aiscript/index.js";
import { SourceLocation } from "../parser/SourceRange.js";

export const primitiveTypeNames = ["str", "num", "bool", "null"] as const;

export type PrimitiveTypeName = (typeof primitiveTypeNames)[number];

export const objectTypeName = ["obj", "arr"] as const;

export type ObjectTypeName = (typeof objectTypeName)[number];

export const typeNames = [
  ...primitiveTypeNames,
  ...objectTypeName,
  "error",
] as const;

export type TypeName = (typeof typeNames)[number];

export interface PrimitiveType {
  type: "PrimitiveType";
  name: PrimitiveTypeName;
}

export interface ObjectType {
  type: "ObjectType";
  items: Map<string, TypeValue> | TypeValue;
}

export interface ArrayType {
  type: "ArrayType";
  item: TypeValue;
}

export interface AnyType {
  type: "AnyType";
}

export interface ErrorType {
  type: "ErrorType";
  name: PrimitiveType & { name: "str" };
  info?: TypeValue;
}

/**
 * まだ推論できていない型情報
 */
export interface NothingType {
  type: "NothingType";
}

export interface FunctionType {
  type: "FunctionType";
  params: { isOptional: boolean; type: TypeValue }[];
  returnType: TypeValue;
}

export interface UnionType {
  type: "UnionType";
  contents: TypeValue[];
}

export type TypeValue =
  | FunctionType
  | AnyType
  | NothingType
  | UnionType
  | PrimitiveType
  | ObjectType
  | ArrayType
  | ErrorType;

export function loc(line: number = 1, column: number = 1): SourceLocation {
  return {
    line,
    column,
  };
}

export function ident(name: string, location = loc()): Ast.Identifier {
  return {
    type: "identifier",
    name: name,
    loc: location,
  };
}

export function primitiveType(name: PrimitiveTypeName): PrimitiveType {
  return {
    type: "PrimitiveType",
    name: name,
  };
}

export function objectType(items: TypeValue): ObjectType {
  return {
    type: "ObjectType",
    items,
  };
}

export function arrayType(item: TypeValue): ArrayType {
  return {
    type: "ArrayType",
    item,
  };
}

export function errorType(info: TypeValue): ErrorType {
  return {
    type: "ErrorType",
    name: {
      type: "PrimitiveType",
      name: "str",
    },
    info,
  };
}

export function fnType(
  params: FunctionType["params"],
  returnType: TypeValue
): FunctionType {
  return {
    type: "FunctionType",
    params,
    returnType,
  };
}

export function union(...types: TypeValue[]): UnionType {
  return {
    type: "UnionType",
    contents: types,
  };
}

export const anyType: AnyType = {
  type: "AnyType",
};
