export interface TestOption {
  l: string;
  v: number;
}

export interface TestQuestion {
  id: string;
  text: string;
  opts: TestOption[];
}

export interface TestDefinition {
  name: string;
  cat: string;
  max: number;
  iconName: string;
  colorClass: string;
  desc: string;
  questions: TestQuestion[];
}

export interface Module {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  iconName: string;
}
