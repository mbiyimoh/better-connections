export class ResearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ResearchError';
  }
}

export class TavilyError extends ResearchError {
  constructor(message: string) {
    super(message, 'TAVILY_ERROR', 502);
  }
}

export class SynthesisError extends ResearchError {
  constructor(message: string) {
    super(message, 'SYNTHESIS_ERROR', 500);
  }
}

export class InsufficientDataError extends ResearchError {
  constructor(
    message: string = 'Contact does not have enough data for research'
  ) {
    super(message, 'INSUFFICIENT_DATA', 400);
  }
}
