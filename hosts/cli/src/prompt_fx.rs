//! EN: CLI prompt-fire — text-cell particles on the prompt/overlay band only.
//! JA: CLI prompt-fire。プロンプト／オーバーレイ帯の文字セル粒子のみ。

use std::collections::VecDeque;

use crossterm::style::Color;
use rand::Rng;

/** EN: Soft cap on concurrent particles (terminal paint cost). */
pub const PARTICLE_CAP: usize = 80;

const TYPE_BURST: usize = 10;
const DELETE_BURST: usize = 12;

/** EN: One glyph particle in cell space (fractional x/y for motion). */
#[derive(Debug, Clone)]
pub struct TextParticle {
    pub ch: char,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub life: f32,
    pub max_life: f32,
    /** EN: Glyphs to flicker through while flying. */
    flicker_pool: [char; 4],
    /** EN: Swap glyph when `life` drops below this. */
    flicker_at: f32,
}

/**
 * EN: Yellow → dark yellow → dark grey by remaining life fraction.
 * JA: 残寿命比で黄 → 暗黄 → 暗灰。
 */
pub fn particle_color(life: f32, max_life: f32) -> Color {
    let t = if max_life <= 0.0 {
        0.0
    } else {
        (life / max_life).clamp(0.0, 1.0)
    };
    if t > 0.66 {
        Color::Yellow
    } else if t > 0.33 {
        Color::DarkYellow
    } else {
        Color::DarkGrey
    }
}

fn push_capped(particles: &mut Vec<TextParticle>, particle: TextParticle) {
    while particles.len() >= PARTICLE_CAP {
        particles.remove(0);
    }
    particles.push(particle);
}

fn build_flicker_pool(primary: char, nearby: &[char]) -> [char; 4] {
    let mut pool = [primary, primary, primary, primary];
    let mut i = 1usize;
    for &c in nearby {
        if i >= 4 {
            break;
        }
        if !c.is_control() && !c.is_whitespace() {
            pool[i] = c;
            i += 1;
        }
    }
    if i < 4 {
        for &fallback in &['*', '+', '.', '#'] {
            if i >= 4 {
                break;
            }
            pool[i] = fallback;
            i += 1;
        }
    }
    pool
}

/**
 * EN: Radial burst from caret cell. `primary` is the typed/deleted glyph.
 * JA: キャレットセルから放射。`primary` は打鍵／削除グリフ。
 */
pub fn spawn_radial_burst(
    particles: &mut Vec<TextParticle>,
    origin_x: f32,
    origin_y: f32,
    primary: char,
    nearby: &[char],
    delete: bool,
    rng: &mut impl Rng,
) {
    let count = if delete { DELETE_BURST } else { TYPE_BURST };
    let pool = build_flicker_pool(primary, nearby);
    for _ in 0..count {
        let angle = rng.gen::<f32>() * std::f32::consts::PI * 2.0;
        let speed = 0.55 + rng.gen::<f32>() * 1.35;
        let max_life = 14.0 + rng.gen::<f32>() * 18.0;
        let ch = if rng.gen_bool(0.72) {
            primary
        } else {
            pool[rng.gen_range(0..4)]
        };
        let flicker_at = max_life * (0.35 + rng.gen::<f32>() * 0.45);
        push_capped(
            particles,
            TextParticle {
                ch,
                x: origin_x + (rng.gen::<f32>() - 0.5) * 0.4,
                y: origin_y + (rng.gen::<f32>() - 0.5) * 0.4,
                vx: angle.cos() * speed,
                vy: angle.sin() * speed,
                life: max_life,
                max_life,
                flicker_pool: pool,
                flicker_at,
            },
        );
    }
}

/**
 * EN: Advance physics; drop dead / off-screen particles. `dt` is frame scale (~1).
 * JA: 物理更新。寿命切れ・画面外を除去。`dt` はフレームスケール（概ね 1）。
 */
pub fn step_particles(
    particles: &mut Vec<TextParticle>,
    cols: u16,
    rows: u16,
    dt: f32,
    rng: &mut impl Rng,
) {
    let max_x = cols.saturating_sub(1) as f32;
    let max_y = rows.saturating_sub(1) as f32;
    let mut i = 0;
    while i < particles.len() {
        let p = &mut particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= dt;
        if p.life <= p.flicker_at && p.life > 0.0 {
            p.ch = p.flicker_pool[rng.gen_range(0..4)];
            p.flicker_at = p.life * 0.55;
        }
        let dead = p.life <= 0.0
            || p.x < -1.0
            || p.y < -1.0
            || p.x > max_x + 1.0
            || p.y > max_y + 1.0;
        if dead {
            particles.remove(i);
        } else {
            i += 1;
        }
    }
}

/** EN: Hard cap for session log ring (rows × 4, then clamp). */
pub fn session_ring_cap(term_rows: u16) -> usize {
    let base = (term_rows as usize).saturating_mul(4).max(64);
    base.min(400)
}

/** EN: Append a log line; drop oldest when over cap. */
pub fn push_session_line(ring: &mut VecDeque<String>, line: impl Into<String>, cap: usize) {
    let text = line.into();
    for part in text.split('\n') {
        let trimmed_end = part.trim_end_matches('\r');
        // EN: Keep empty lines so multi-line dumps preserve spacing.
        ring.push_back(trimmed_end.to_string());
        while ring.len() > cap.max(1) {
            ring.pop_front();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::rngs::StdRng;
    use rand::SeedableRng;

    #[test]
    fn color_steps_yellow_to_grey() {
        assert_eq!(particle_color(10.0, 10.0), Color::Yellow);
        assert_eq!(particle_color(5.0, 10.0), Color::DarkYellow);
        assert_eq!(particle_color(1.0, 10.0), Color::DarkGrey);
    }

    #[test]
    fn spawn_respects_cap() {
        let mut particles = Vec::new();
        let mut rng = StdRng::seed_from_u64(1);
        for _ in 0..20 {
            spawn_radial_burst(&mut particles, 10.0, 5.0, 'a', &['b', 'c'], false, &mut rng);
        }
        assert!(particles.len() <= PARTICLE_CAP);
        assert!(!particles.is_empty());
    }

    #[test]
    fn step_removes_dead_particles() {
        let mut particles = vec![TextParticle {
            ch: 'x',
            x: 1.0,
            y: 1.0,
            vx: 0.0,
            vy: 0.0,
            life: 0.5,
            max_life: 10.0,
            flicker_pool: ['x', 'x', 'x', 'x'],
            flicker_at: 0.0,
        }];
        let mut rng = StdRng::seed_from_u64(2);
        step_particles(&mut particles, 80, 24, 1.0, &mut rng);
        assert!(particles.is_empty());
    }

    #[test]
    fn ring_drops_oldest_over_cap() {
        let mut ring = VecDeque::new();
        push_session_line(&mut ring, "a", 2);
        push_session_line(&mut ring, "b", 2);
        push_session_line(&mut ring, "c", 2);
        assert_eq!(ring.len(), 2);
        assert_eq!(ring.front().map(String::as_str), Some("b"));
        assert_eq!(ring.back().map(String::as_str), Some("c"));
    }

    #[test]
    fn type_burst_count_is_bounded() {
        let mut particles = Vec::new();
        let mut rng = StdRng::seed_from_u64(3);
        spawn_radial_burst(&mut particles, 0.0, 0.0, 'z', &[], false, &mut rng);
        assert_eq!(particles.len(), TYPE_BURST);
        particles.clear();
        spawn_radial_burst(&mut particles, 0.0, 0.0, 'z', &[], true, &mut rng);
        assert_eq!(particles.len(), DELETE_BURST);
    }
}
