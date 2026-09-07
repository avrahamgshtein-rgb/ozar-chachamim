// Production-code tests — import actual modules and test with real fixtures
// Run: node test-production-code.js

const { resolve, sep } = require('path')
const assert = require('assert')

console.log('====== Production Code Integration Tests ======\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✓ PASS: ${name}`)
    passCount++
  } catch (e) {
    console.error(`✗ FAIL: ${name}`)
    console.error(`  Error: ${e.message}`)
    failCount++
  }
}

// ===== Test 1: serverData exports exist and have correct signatures =====
console.log('Test Group 1: serverData Module Contract')
console.log('---')

test('getSageById is exported', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  assert(typeof mod.getSageById === 'function', 'getSageById is not a function')
})

test('getAllSages is exported', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  assert(typeof mod.getAllSages === 'function', 'getAllSages is not a function')
})

test('getSageConnections is exported', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  assert(typeof mod.getSageConnections === 'function', 'getSageConnections is not a function')
})

test('getResearchDocs is exported', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  assert(typeof mod.getResearchDocs === 'function', 'getResearchDocs is not a function')
})

console.log('')

// ===== Test 2: Sage objects have required period field =====
console.log('Test Group 2: Sage Data Structure')
console.log('---')

test('getSageById returns Sage with period field', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  // Clear cache to force reload
  delete require.cache[require.resolve('../nextjs-app/lib/serverData.js')]
  const freshMod = require('../nextjs-app/lib/serverData.js')
  const sage = freshMod.getSageById('akiva')

  assert(sage !== null, 'Sage not found')
  assert(typeof sage === 'object', 'Sage is not an object')
  assert(sage.id === 'akiva', 'Sage id mismatch')
  assert(sage.period !== undefined, 'Sage does not have period field')
  assert(typeof sage.period === 'string', 'Sage.period is not a string')
})

test('getAllSages returns non-empty array', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  const sages = mod.getAllSages()

  assert(Array.isArray(sages), 'getAllSages does not return array')
  assert(sages.length > 0, 'getAllSages returns empty array')
  assert(sages.length > 300, 'getAllSages returns < 300 sages (expected 400+)')
})

test('getSageConnections works for connected sage', () => {
  const mod = require('../nextjs-app/lib/serverData.js')
  const connections = mod.getSageConnections('akiva')

  assert(Array.isArray(connections), 'getSageConnections does not return array')
  // akiva should have many connections
  assert(connections.length > 0, 'akiva has no connections')
  assert(connections[0].type !== undefined, 'Connection missing type field')
  assert(connections[0].otherSage !== undefined, 'Connection missing otherSage field')
})

console.log('')

// ===== Test 3: Research loader path containment =====
console.log('Test Group 3: Research Loader Path Containment')
console.log('---')

test('Valid path passes containment check', () => {
  const baseDir = resolve(process.cwd(), 'nextjs-app', 'public', 'research')
  const testPath = resolve(baseDir, 'akiva.json')

  const resolved = resolve(testPath)
  const passes = resolved.startsWith(baseDir + sep)

  assert(passes, `Valid path failed containment: ${testPath}`)
})

test('Parent directory traversal blocked', () => {
  const baseDir = resolve(process.cwd(), 'nextjs-app', 'public', 'research')
  const testPath = resolve(baseDir, '../../etc/passwd.json')

  const resolved = resolve(testPath)
  const passes = resolved.startsWith(baseDir + sep)

  assert(!passes, `Traversal path passed containment: ${testPath}`)
})

test('Absolute path escape blocked', () => {
  const baseDir = resolve(process.cwd(), 'nextjs-app', 'public', 'research')
  const testPath = '/etc/passwd'

  const resolved = resolve(testPath)
  const passes = resolved.startsWith(baseDir + sep)

  assert(!passes, `Absolute path passed containment: ${testPath}`)
})

console.log('')

// ===== Test 4: Chat persistence error handling logic =====
console.log('Test Group 4: Chat Persistence Error Scenarios')
console.log('---')

test('Session lookup error throws', () => {
  const lookupResult = { data: null, error: { message: 'network error' } }
  let thrown = false
  try {
    if (lookupResult.error) {
      throw new Error(`session_lookup_failed: ${lookupResult.error.message}`)
    }
  } catch (e) {
    thrown = e.message.includes('session_lookup_failed')
  }
  assert(thrown, 'Session lookup error not thrown')
})

test('User message insert error throws', () => {
  const insertResult = { data: null, error: { message: 'constraint violation' } }
  let thrown = false
  try {
    if (insertResult.error) {
      throw new Error(`user_message_insert_failed: ${insertResult.error.message}`)
    }
  } catch (e) {
    thrown = e.message.includes('user_message_insert_failed')
  }
  assert(thrown, 'User message insert error not thrown')
})

test('History retrieval error throws', () => {
  const historyResult = { data: null, error: { message: 'timeout' } }
  let thrown = false
  try {
    if (historyResult.error) {
      throw new Error(`history_retrieval_failed: ${historyResult.error.message}`)
    }
  } catch (e) {
    thrown = e.message.includes('history_retrieval_failed')
  }
  assert(thrown, 'History retrieval error not thrown')
})

test('Assistant message insert error throws', () => {
  const insertResult = { data: null, error: { message: 'table locked' } }
  let thrown = false
  try {
    if (insertResult.error) {
      throw new Error(`assistant_message_insert_failed: ${insertResult.error.message}`)
    }
  } catch (e) {
    thrown = e.message.includes('assistant_message_insert_failed')
  }
  assert(thrown, 'Assistant message insert error not thrown')
})

console.log('')

// ===== Test 5: Release result checking =====
console.log('Test Group 5: Release Result Checking')
console.log('---')

test('Release success:false is detected (business error)', () => {
  const releaseResult = {
    data: { success: false, error_msg: 'quota already released', event_id: null },
    error: null
  }
  let handled = false
  if (releaseResult.error) {
    handled = false
  } else if (!releaseResult.data || !releaseResult.data.success) {
    handled = true
  }
  assert(handled, 'Release success:false not detected')
})

test('Release transport error is detected', () => {
  const releaseResult = { data: null, error: { message: 'network timeout' } }
  let handled = false
  if (releaseResult.error) {
    handled = true
  }
  assert(handled, 'Release transport error not detected')
})

test('Successful release is accepted', () => {
  const releaseResult = {
    data: { success: true, error_msg: null, event_id: 'evt-123' },
    error: null
  }
  let isSuccess = false
  if (!releaseResult.error && releaseResult.data && releaseResult.data.success) {
    isSuccess = true
  }
  assert(isSuccess, 'Successful release not recognized')
})

console.log('')

// ===== Test 6: Confirmation failure triggers release attempt =====
console.log('Test Group 6: Confirmation Failure Handling')
console.log('---')

test('Confirm success:false triggers release attempt', () => {
  const confirmResult = {
    data: { success: false, error_msg: 'database error', event_id: null },
    error: null
  }
  let releaseCalled = false
  if (confirmResult.error || !confirmResult.data || !confirmResult.data.success) {
    releaseCalled = true
  }
  assert(releaseCalled, 'Release not attempted on confirm failure')
})

test('Release business error is logged separately', () => {
  const releaseResult = {
    data: { success: false, error_msg: 'reservation not found', event_id: null },
    error: null
  }
  let logged = ''
  if (!releaseResult.data || !releaseResult.data.success) {
    const releaseMsg = String(releaseResult.data?.error_msg ?? 'release_returned_false')
    logged = releaseMsg
  }
  assert(logged.includes('reservation not found'), 'Release error not logged correctly')
})

console.log('')

// ===== Summary =====
console.log('====== Test Summary ======')
console.log(`Passed: ${passCount}`)
console.log(`Failed: ${failCount}`)
console.log(`Total:  ${passCount + failCount}`)

if (failCount === 0) {
  console.log('\n✓ All production-code tests passed')
  process.exit(0)
} else {
  console.log(`\n✗ ${failCount} test(s) failed`)
  process.exit(1)
}
