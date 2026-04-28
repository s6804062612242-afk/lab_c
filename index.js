const express = require('express');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;
const DOCKER_IMAGE = process.env.JUDGE_DOCKER_IMAGE || 'gcc:latest';
const CONTAINER_WORKDIR = '/app';
const RUN_TIMEOUT_MS = 2000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

function safeUnlink(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function createTempNames() {
  const id = crypto.randomBytes(6).toString('hex');
  return {
    sourceName: `solution_${id}.c`,
    binaryName: `solution_${id}.out`,
  };
}

function compileC(sourceName, binaryName) {
  const compile = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${__dirname}:${CONTAINER_WORKDIR}`,
      '-w',
      CONTAINER_WORKDIR,
      DOCKER_IMAGE,
      'gcc',
      sourceName,
      '-O2',
      '-std=c11',
      '-o',
      binaryName,
    ],
    { encoding: 'utf8' },
  );

  if (compile.error) {
    return { status: 'Compilation Error', details: compile.error.message };
  }

  if (compile.status !== 0) {
    return {
      status: 'Compilation Error',
      details: compile.stderr || compile.stdout || `Exited with code ${compile.status}`,
    };
  }

  return { status: 'Accepted' };
}

function runBinary(binaryName, input) {
  const run = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '-i',
      '-v',
      `${__dirname}:${CONTAINER_WORKDIR}`,
      '-w',
      CONTAINER_WORKDIR,
      '--memory',
      '128m',
      '--cpus',
      '0.5',
      '--network',
      'none',
      DOCKER_IMAGE,
      `./${binaryName}`,
    ],
    {
      input: input ?? '',
      timeout: RUN_TIMEOUT_MS,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    },
  );

  if (run.error) {
    if (run.error.code === 'ETIMEDOUT') {
      return { status: 'Time Limit Exceeded' };
    }
    return { status: 'Runtime Error', details: run.error.message };
  }

  if (run.status !== 0) {
    return {
      status: 'Runtime Error',
      details: run.stderr || run.stdout || `Exited with code ${run.status}`,
    };
  }

  return { status: 'Accepted', stdout: run.stdout ?? '' };
}

function runCodeOnce(userCode, input) {
  const { sourceName, binaryName } = createTempNames();
  const sourcePath = path.join(__dirname, sourceName);
  const binaryPath = path.join(__dirname, binaryName);
  fs.writeFileSync(sourcePath, userCode);

  try {
    const compileResult = compileC(sourceName, binaryName);
    if (compileResult.status !== 'Accepted') {
      return compileResult;
    }
    return runBinary(binaryName, input);
  } finally {
    safeUnlink(sourcePath);
    safeUnlink(binaryPath);
  }
}

function judgeCode(userCode, testCases) {
  const { sourceName, binaryName } = createTempNames();
  const sourcePath = path.join(__dirname, sourceName);
  const binaryPath = path.join(__dirname, binaryName);
  fs.writeFileSync(sourcePath, userCode);

  try {
    const compileResult = compileC(sourceName, binaryName);
    if (compileResult.status !== 'Accepted') {
      return compileResult;
    }

    for (const test of testCases) {
      const runResult = runBinary(binaryName, test.input);
      if (runResult.status !== 'Accepted') {
        return runResult;
      }
      if ((runResult.stdout || '').trim() !== test.output.trim()) {
        return {
          status: 'Wrong Answer',
          input: test.input,
          expected: test.output,
          got: (runResult.stdout || '').trim(),
        };
      }
    }

    return { status: 'Accepted' };
  } finally {
    safeUnlink(sourcePath);
    safeUnlink(binaryPath);
  }
}

function validateRunPayload(body) {
  if (!body || typeof body.code !== 'string' || body.code.trim() === '') {
    return 'Code is required';
  }
  if (body.language && body.language !== 'C') {
    return 'Only C language is supported';
  }
  return null;
}

app.post('/api/run', (req, res) => {
  const validationError = validateRunPayload(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const result = runCodeOnce(req.body.code, req.body.input || '');
  if (result.status === 'Accepted') {
    res.json({ output: result.stdout ?? '' });
    return;
  }

  res.status(400).json({
    error: result.status,
    details: result.details || '',
  });
});

app.post('/api/submit', (req, res) => {
  const validationError = validateRunPayload(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const testCasesMock = [
    { input: '1 2', output: '3' },
    { input: '10 20', output: '30' },
  ];

  const startedAt = Date.now();
  const result = judgeCode(req.body.code, testCasesMock);
  res.json({ ...result, executionTime: `${Date.now() - startedAt}ms` });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(port, () => {
  console.log(`Grader server listening at http://localhost:${port}`);
});
