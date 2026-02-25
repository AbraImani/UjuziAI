# Agent Architecture Documentation

## Overview

BuildSkillAI uses a multi-agent architecture coordinated through three protocols:

- **ADK (Agent Development Kit)**: Agent lifecycle and orchestration
- **MCP (Model Context Protocol)**: User context persistence and memory
- **A2A (Agent-to-Agent)**: Inter-agent communication pipeline

## Agent Diagram

```
┌─────────────────────────────────────────────────────┐
│                 Agent Orchestrator (ADK)              │
│                                                       │
│  ┌─────────────┐    ┌──────────────────────────────┐ │
│  │  MCP Context │◄──►│     Context Store (Memory)    │ │
│  │    Layer     │    └──────────────────────────────┘ │
│  └──────┬──────┘                                      │
│         │                                             │
│  ┌──────▼──────────────────────────────────────────┐ │
│  │              A2A Communication Pipeline          │ │
│  │                                                   │ │
│  │  ┌───────────────┐    ┌───────────────────────┐  │ │
│  │  │   Question     │───►│    Anti-Hallucination  │  │ │
│  │  │   Generator    │    │       Agent            │  │ │
│  │  │   Agent        │    │  (Validates questions) │  │ │
│  │  └───────────────┘    └───────────────────────┘  │ │
│  │                                                   │ │
│  │  ┌───────────────┐    ┌───────────────────────┐  │ │
│  │  │   Evaluation   │───►│    Anti-Hallucination  │  │ │
│  │  │   Agent        │    │       Agent            │  │ │
│  │  │  (Grades exam) │    │  (Verifies grading)   │  │ │
│  │  └───────┬───────┘    └───────────────────────┘  │ │
│  │          │                                        │ │
│  │  ┌───────▼───────┐                               │ │
│  │  │   Ranking      │                               │ │
│  │  │   Agent        │                               │ │
│  │  │  (Updates rank)│                               │ │
│  │  └───────────────┘                               │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Agents

### 1. Question Generator Agent
**File**: `functions/src/agents/questionGenerator.js`  
**ADK Role**: Task Execution Agent  
**A2A**: Receives config → Sends questions to Anti-Hallucination

**Responsibilities**:
- Generates dynamic question pools per module
- 7 MCQs (25-30s each) + 3 open-ended (5min each)
- Varies concepts between attempts to prevent memorization
- Adjusts difficulty based on user history (MCP data)

**Generation Flow**:
1. Receive module config + user context from Orchestrator
2. Select questions from module-specific bank
3. Prioritize untested concepts for retry attempts
4. Shuffle options and rephrase for variation
5. Send to Anti-Hallucination Agent for validation

### 2. Evaluation Agent
**File**: `functions/src/agents/evaluation.js`  
**ADK Role**: Evaluation Worker Agent  
**A2A**: Receives answers → Sends grades to Anti-Hallucination

**Responsibilities**:
- Grades MCQ answers (automatic, deterministic)
- Evaluates open-ended responses with:
  - **Specificity analysis**: Technical terms, code references
  - **Coherence check**: Sentence structure, logical flow
  - **Depth analysis**: Word count, concept coverage
- Detects AI-generated content via pattern matching
- Detects copy-paste behavior
- Applies scoring: 10 points per section (MCQ + Open)

**Anti-Cheat Detection**:
- AI patterns: "As an AI", "certainly", "delve into", etc.
- Vocabulary uniformity check (AI uses consistently sophisticated words)
- Copy-paste indicators (tabs, URLs, copyright notices)
- Generic response detection (too short, vague)
- **Warning** on first detection, **Zero** on second detection

### 3. Anti-Hallucination Agent
**File**: `functions/src/agents/antiHallucination.js`  
**ADK Role**: Quality Assurance Agent  
**A2A**: Receives from QuestionGenerator + Evaluation → Returns verified results

**Responsibilities**:
- Cross-checks questions against module context
- Validates no off-topic or irrelevant content
- Verifies grading consistency
- Adjusts scores when discrepancies detected
- Replaces invalid questions with safe fallbacks

**Validation Rules**:
- Questions must match module's valid concepts
- Questions must not reference competitor products
- Scores must be proportional to answer quality
- Short answers cannot score high

### 4. Ranking Agent
**File**: `functions/src/agents/ranking.js`  
**ADK Role**: Data Processing Agent  
**A2A**: Receives score updates → Updates global rankings

**Responsibilities**:
- Calculates cumulative scores across all modules
- Updates global leaderboard ranking
- Maintains ranking consistency with batch updates
- Provides user rank info for display

## Protocol Details

### ADK (Agent Development Kit)
```
Lifecycle: Initialize → Configure → Execute → Validate → Report
```
- Each agent has a name, version, and clear interface
- Orchestrator manages agent lifecycle
- Configuration is injected per-task

### MCP (Model Context Protocol)
```
Context: User Profile + Progress + Previous Attempts + Timestamps
```
- In-memory cache with 5-minute TTL
- Persisted to Firestore for long-term memory
- Context includes user history for personalization
- Used by QuestionGenerator for concept variation

### A2A (Agent-to-Agent Communication)
```
Pipeline: QuestionGen → AntiHallucination → (exam) → Evaluation → AntiHallucination → Ranking
```
- Synchronous pipeline execution
- Each agent receives output from the previous
- Results are verified before passing downstream
- Orchestrator coordinates the full pipeline

## Scoring System

| Component | Points | Passing |
|-----------|--------|---------|
| MCQ Section (7 questions) | 0-10 | — |
| Open Section (3 questions) | 0-10 | — |
| **Total Score** | **Average of both** | **≥ 6/10** |

- MCQ: (correct / total) × 10
- Open: average(question_scores) × 10
- Total: (MCQ + Open) / 2
- Badge issued if total ≥ 6
