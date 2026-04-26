// Tiny xorshift64 RNG so this project has zero external dependencies.
// In real Rust code you would use the `rand` crate.

pub struct XorShift64 {
    state: u64,
}

impl XorShift64 {
    pub fn new(seed: u64) -> Self {
        // xorshift breaks with state 0; nudge zero seeds.
        Self { state: if seed == 0 { 0x9E3779B97F4A7C15 } else { seed } }
    }

    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    pub fn range(&mut self, exclusive_hi: usize) -> usize {
        (self.next_u64() as usize) % exclusive_hi
    }
}
