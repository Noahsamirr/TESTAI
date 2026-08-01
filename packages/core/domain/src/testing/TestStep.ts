import { ValueObject, type ValueObjectProps } from '@testmind/shared-kernel';

export interface TestStepProps extends ValueObjectProps {
  stepNumber: number;
  action: string;
  expectedResult: string;
  testData?: string;
}

export class TestStep extends ValueObject<TestStepProps> {
  private constructor(props: TestStepProps) {
    super(props);
  }

  public static create(params: TestStepProps): TestStep {
    return new TestStep(params);
  }

  get stepNumber(): number {
    return this.props.stepNumber;
  }

  get action(): string {
    return this.props.action;
  }

  get expectedResult(): string {
    return this.props.expectedResult;
  }

  get testData(): string | undefined {
    return this.props.testData;
  }
}
