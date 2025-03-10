# vLEI Workflows Running Tool

[![npm version](https://badge.fury.io/js/vlei-verifier-workflows.svg)](https://www.npmjs.com/package/vlei-verifier-workflows)  
[![GitHub License](https://img.shields.io/github/license/GLEIF-IT/vlei-verifier-workflows.svg)](https://github.com/GLEIF-IT/vlei-verifier-workflows/blob/main/LICENSE)

A tool for running workflows related to vLEI (verifiable Legal Entity Identifier) users and credentials. This library provides a robust framework for defining and executing workflows involving vLEI users and credentials.

---

## PLEASE ENSURE CORRECTNESS IN THIS DOCUMENT BEFORE REPUBLISHING IT AS THE DEFINITIVE README

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Predefined Step Types](#predefined-step-types)
    - [Custom Step Types](#custom-step-types)
- [Workflow Structure](#workflow-structure)
- [Configuration Structure](#configuration-structure)
- [Interaction Between Workflow and Configuration](#interaction-between-workflow-and-configuration)
- [Summary](#summary)

---

## Overview

The **vLEI Workflows Running Tool** is designed to manage workflows involving vLEI users and credentials. It allows users to define workflows consisting of multiple steps, each representing an action such as issuing or revoking credentials. The library includes built-in support for common step types and provides flexibility for defining custom step types with their own logic.

---

## Key Features

- **Predefined Step Runners**: Includes built-in support for:

  - `issue_credential`: Issues a new vLEI credential.
  - `revoke_credential`: Revokes an existing vLEI credential.
  - `add_root_of_trust`: Adds a new root of trust for testing.

- **Custom Step Runners**: Allows you to define and register custom step types for any other workflow requirements.

- **Flexible Workflow Definition**: Create workflows with any combination of predefined and custom steps, each with its own set of attributes and properties.

- **YAML-Based Workflows**: Workflows are defined in YAML format, making them easy to read, write, and extend.

---

## Getting Started

### Installation

Install the package using npm:

```bash
npm install vlei-verifier-workflows
```

### Usage

#### Predefined Step Types

To use predefined step types, simply include them in your workflow configuration. These step types are automatically registered and ready to use.

Example workflow :

```yaml
workflow:
  steps:
    qvi_cred:
      id: 'qvi_cred'
      type: 'issue_credential'
      attributes:
        LEI: '254900OPPU84GM83MG36'
      issuer_aid: 'gleif-aid-1'
      issuee_aid: 'qvi-aid-1'
      description: 'GLEIF issues QVI vLEI credential'
      credential: 'gleif_to_qvi_vlei_cred'
    revoke_qvi_cred:
      id: 'revoke_qvi_cred'
      type: 'revoke_credential'
      attributes:
        credentialId: 'abc123'
    add_root_of_trust:
      id: 'add_root_of_trust'
      type: 'add_root_of_trust'
      description: 'Adding Root of Trust'
```

#### Custom Step Types

For any step type not covered by the predefined runners, you need to register a custom step runner.

1.  **Create a Custom Step Runner** : Extend the `StepRunner` class to implement your custom logic.

```typescript
import { StepRunner } from 'vlei-verifier-workflows';

class MyCustomStepRunner extends StepRunner {
  public async run(vi: any, stepName: string, step: any): Promise<any> {
    console.log(`Executing custom step: ${stepName}`);
    // Add your custom logic here
    return { success: true };
  }
}
```

2. **Register the Custom Step Runner** : Use the `WorkflowRunner.registerRunner` method to register your custom step runner.

```typescript
import {
  WorkflowRunner,
  getConfig,
  loadWorkflow,
} from 'vlei-verifier-workflows';
import { MyCustomStepRunner } from './path/to/MyCustomStepRunner';

const workflow = loadWorkflow('path_to_workflow_yaml_file');
const configJson = await getConfig('path_to_config_json_file');
const runner = new WorkflowRunner(workflow, configJson);
WorkflowRunner.registerRunner('my_custom_step', MyCustomStepRunner);
```

3. **Use the Custom Step in Your Workflow** : Include the custom step type in your workflow configuration, specifying any attributes required for execution.

```yaml
workflow:
  steps:
    custom_step:
      id: 'custom_step'
      type: 'my_custom_step'
      customProperty: 'value'
      anotherProperty: 'example'
```

4.  **Run workflow** : Run the workflow using the WorkflowRunner.

```typescript
import {
  WorkflowRunner,
  getConfig,
  loadWorkflow,
} from 'vlei-verifier-workflows';
import { MyCustomStepRunner } from './path/to/MyCustomStepRunner';

const workflow = loadWorkflow('path_to_workflow_yaml_file');
const configJson = await getConfig('path_to_config_json_file');
const runner = new WorkflowRunner(workflow, configJson);
runner.registerRunner('my_custom_step', MyCustomStepRunner);
const workflowRunResult = await runner.runWorkflow();
assert.equal(workflowRunResult, true);
```

## Workflow Structure

Workflows are defined as YAML files with the following structure:

```yaml
workflow:
  steps:
    <step_id>:
      id: "<unique_step_id>" # Mandatory
      type: "<step_type>" # Mandatory
      <attribute_name>: "<attribute_value>"
      ...
```

- **`id`** : A unique identifier for the step (mandatory).
- **`type`** : The type of the step (mandatory), e.g., `issue_credential`, `revoke_credential`, or a custom type.
- **Attributes** : Any set of key-value pairs specific to the step type. These attributes provide the data required for the step runner to execute the step.

#### Example Attributes for `issue_credential` Step Type:

- `attributes`: Additional metadata for the credential (e.g., `LEI`).
- `issuer_aid`: Identifier for the issuing party.
- `issuee_aid`: Identifier for the receiving party.
- `description`: A human-readable description of the step.
- `credential`: Reference to a credential definition in the configuration file.
- `credential_source`: Specifies the source of the credential (e.g., another step).

#### Custom Steps:

For custom step types, you can define any list of attributes based on the data required by your custom step runner. Only `id` and `type` are mandatory; all other attributes are optional and depend on the specific requirements of the step.

## Configuration Structure

The configuration file provides the data and settings required to execute the workflow. It includes secrets, credentials, agents, identifiers, and users.

Example configuration file:

```json
{
  "secrets": {
    "gleif1": "D_PbQb01zuzQgK-kDWjq5",
    "qvi1": "BTaqgh1eeOjXO5iQJp6m5",
    "le1": "Akv4TFoiYeHNqzj3N8gE5",
    "ecr1": "nf98hUHUy8Vt5tvdyaYV5"
  },
  "credentials": {
    "gleif_to_qvi_vlei_cred": {
      "type": "direct",
      "schema": "QVI_SCHEMA_SAID",
      "privacy": false,
      "attributes": {}
    },
    "qvi_to_le_vlei_cred": {
      "credSource": {
        "type": "qvi"
      },
      "type": "direct",
      "schema": "LE_SCHEMA_SAID",
      "rules": "LE_RULES",
      "privacy": false,
      "attributes": {}
    }
  },
  "agents": {
    "gleif-agent-1": {
      "secret": "gleif1"
    },
    "qvi-agent-1": {
      "secret": "qvi1"
    }
  },
  "identifiers": {
    "gleif-aid-1": {
      "agent": "gleif-agent-1",
      "name": "gleif-aid-1"
    },
    "qvi-aid-1": {
      "delegator": "gleif-aid-1",
      "agent": "qvi-agent-1",
      "name": "qvi-aid-1"
    }
  },
  "users": [
    {
      "type": "GLEIF",
      "alias": "gleif-user-1",
      "identifiers": ["gleif-aid-1"]
    },
    {
      "type": "QVI",
      "alias": "qvi-user-1",
      "identifiers": ["qvi-aid-1"]
    }
  ]
}
```

#### Key Components:

- **`secrets`** : Stores sensitive information like agent secrets.
- **`credentials`** : Defines credential templates referenced in the workflow.
- **`agents`** : Maps agent names to their secrets.
- **`identifiers`** : Associates AIDs with agents and delegates.
- **`users`** : Represents entities involved in the workflow, linking them to their identifiers.

## Interaction Between Workflow and Configuration

- **Credential Issuance Example** :

  - In the workflow, the `qvi_cred` step references the `gleif_to_qvi_vlei_cred` credential.
  - The configuration file defines this credential under `credentials.gleif_to_qvi_vlei_cred`.
  - During execution, the system uses the `issuer_aid` (`gleif-aid-1`) and `issuee_aid` (`qvi-aid-1`) to issue the credential, ensuring proper delegation and validation.

- **Agent Secret Lookup** :

  - When a step involves an agent (e.g., signing a request), the system looks up the agent's secret from the `agents` section in the configuration file.

- **User Identification** :

  - Users are defined in the `users` section, linking them to their identifiers. This ensures that each step can correctly identify the relevant parties.

## Summary

- **Workflow** : Defines the sequence of steps and their relationships, referencing credentials and identifiers.
- **Configuration** : Provides the necessary data (secrets, credentials, agents, identifiers, users) to execute the workflow.
- **Execution** : The system combines the workflow and configuration to perform actions like issuing credentials, generating reports, or running API tests.

This modular design allows for flexibility in defining workflows while maintaining clear separation between logic (workflow) and data (configuration).
