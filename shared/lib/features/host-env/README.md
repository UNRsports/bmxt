# host-env

Runtime host matrix. **Do not put Fenix / moz-extension branches in feature code** — import from here.

## Product matrix

| | PC | SP |
|---|---|---|
| Chrome | `shell/popup` | `shell/popup` |
| Firefox | `shell/popup` | `shell/tab` (**only special case**) |

## Layout

```
pc/          # desktop APIs (windows, commands, tabGroups, mirror focus)
sp/          # Android stubs / safe no-ops (mainly Fenix)
shell/popup/ # Chrome PC/SP + Firefox PC
shell/tab/   # Firefox SP only
*.ts         # thin dispatchers (resolveFormFactor / usesTabShell)
```

- `usesTabShell()` → Firefox origin ∧ Android UA (SP)
- Form-factor `sp` → `pc|sp` capability modules
- Shell mode → `shell/popup|tab` preview / launch behavior
