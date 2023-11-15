export interface NamedType {
  type: "NamedType";
  name: string;
  inner?: TypeValue;
}

export interface AnyType extends NamedType {
  type: "NamedType";
  name: "any";
}

/**
 * まだ推論できていない型情報
 */
export interface NothingType {
  type: "NothingType";
}

export interface FunctionType {
  type: "FunctionType";
  params: TypeValue[];
  returnType: TypeValue;
}

export type TypeValue = NamedType | FunctionType | AnyType | NothingType;
