---
name: int-generate-tests
description: Unit test generation workflow following TDD standards and Jest testing guidelines.
---

# INT Unit Test Generation Workflow
Please generate unit tests for the provided Node.js code. You must adhere to the following testing standards:
* **Framework:** Assume we are using Jest as our primary testing framework.
* **Coverage:** Write tests covering the "happy path", expected failure scenarios, and edge cases.
* **Mocking:** Mock all external dependencies, including database calls, third-party API requests, and file system operations using Jest's mocking utilities.
* **Assertions:** Write clear and descriptive assertions. Ensure that the error messages actually test the specific error thrown, not just a generic failure.
* **Structure:** Group related tests using `describe` blocks and use `it` blocks for individual test cases. Follow the Arrange-Act-Assert pattern.
Output the complete test file code so it can be copied directly into the project.
