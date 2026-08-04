// Deliberately slow test fixture. Used ONLY by the test that proves a spent cargo-test budget
// SKIPS the call rather than passing `timeout: 0` (which child_process treats as "no timeout").
// If the workflow ever regresses to passing 0/negative through to execFile, this test would
// actually run to completion (taking >= SLEEP_MS) instead of returning almost instantly.
#[cfg(test)]
mod tests {
    #[test]
    fn it_eventually_passes() {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        assert_eq!(2 + 2, 4);
    }
}
