# Developer Agent 強化：全自動化フロー実装

## 概要

Developer Agent に以下の権限・能力を追加し、**GCP ステージング自動化を完全自動実行** 可能にしました。

### ✨ 追加権限

```hcl
tools: [
  'run_in_terminal',           # ターミナルコマンド実行（新規）
  'multi_replace_string_in_file', # マルチファイル置換（新規）
  'manage_todo_list',          # 段階的タスク管理（新規）
  ... 既存ツール
]
```

### 🚀 新機能

| 機能 | 説明 |
|------|------|
| ✅ ファイル自動作成 | Terraform, YAML, Script を自動生成 |
| ✅ in-place edit | バックアップ作成 → 安全な修正 → git 管理 |
| ✅ ターミナル自動実行 | `gcloud`, `terraform`, `docker`, `git` コマンド実行 |
| ✅ 自動化フロー実行 | 環境確認 → ファイル生成 → 検証 → コミット・PR 一貫実行 |
| ✅ 段階的管理 | 複雑なタスクを todo リストで進捗管理 |

---

## 変更内容

### 1. tools フィールド拡張

**追加**:
- `run_in_terminal` : gcloud, terraform, docker コマンド実行
- `multi_replace_string_in_file` : 複数ファイルの同時修正
- `manage_todo_list` : タスク進捗管理

### 2. 権限・責務セクション新規追加

**フルアクセス権限**:
- ファイル作成・編集（`.tf`, `.yaml`, `.json`, `.md`）
- ターミナル実行（gcloud, terraform, docker, git）
- Terraform 完全管理（init, validate, plan, apply）
- GCP リソース自動作成

**最優先責務**:
- 自動化ファースト（手作業最小化）
- in-place edit（バックアップ + git で復旧可能）
- 段階的実行（複雑なタスク = todo リスト）
- セキュリティ（シークレット = Secret Manager）
- 検証（各ステップで validate/plan/test）

### 3. ワークフロー（自動化フロー）詳細化

5 フェーズの自動実行パターン：
1. **環境確認 & 計画** → todo リスト作成
2. **ファイル・コード生成** → バックアップ → in-place edit
3. **ローカル実行・検証** → plan/test 実行
4. **コミット・PR 作成** → 小分けコミット
5. **本番適用** → デプロイ・監視・ロールバック

### 4. .gitignore 修正

**修正内容**:
```diff
- .github/
+ .github/backups/          # バックアップファイルは無視
+ .github/workflows/.secrets # シークレット無視
```

**理由**: エージェント定義ファイル（`.md`）は **git で管理する必要がある**ため、全無視を解除

---

## テスト方法

### 1. Developer Agent による Service Account 自動化

```bash
# Developer を呼び出し
"GCP ステージング Terraform Service Account を自動作成してください"
```

**期待結果**:
- ✅ `infra/staging/service-accounts.tf` 自動生成
- ✅ `terraform validate` & `terraform plan` 実行
- ✅ `terraform apply` で Service Account 作成
- ✅ 出力値取得 → GitHub Secrets 登録手順報告
- ✅ Git コミット・PR 自動作成

### 2. in-place edit テスト

既存ファイル修正時：
```bash
# Developer が自動実行
# (1) バックアップ作成：.github/agents/backups/<name>.backup.<timestamp>
# (2) in-place edit（replace_string_in_file）で修正
# (3) git status 確認 → コミット
```

### 3. マルチファイル修正テスト

複数ファイル同時修正時：
```bash
# Developer が自動実行
# multi_replace_string_in_file で複数 .tf ファイル同時修正
# → エラーハンドリング → 結果報告
```

---

## リスク評価

### リスク 1: ターミナル実行による環境破損

**リスク**: 誤ったコマンド実行で GCP リソース削除  
**対策**:
- Terraform `plan` で必ず確認（apply 前）
- `terraform destroy` は手動トリガーのみ
- GitHub Actions は approval 必須

### リスク 2: シークレット漏洩

**リスク**: Service Account キーが state に含まれる  
**対策**:
- `.gitignore` で state ファイル無視
- GitHub Secrets で管理
- Secret Manager で本番管理

### リスク 3: バックアップ散乱

**リスク**: バックアップファイルが増加  
**対策**:
- `.gitignore` で `backups/` 無視
- 定期的に古いバックアップ削除
- git 履歴で復旧可能

---

## デプロイ後の確認

### ✅ チェックリスト

- [ ] `.github/agents/developer.agent.md` 確認（tools 拡張）
- [ ] `.gitignore` 修正確認（`.github/backups/` 無視）
- [ ] Developer による Service Account 自動化テスト
- [ ] バックアップ作成確認（`backups/` ディレクトリ）
- [ ] in-place edit による既存ファイル修正テスト
- [ ] Git コミット・PR 自動作成確認

---

## 次フェーズ

### Phase 2: GCP ステージング Terraform 自動化
Developer が以下を独立実行：
- Service Account 自動作成（このコミット後）
- Cloud SQL インスタンス自動作成
- GCS バケット自動作成
- GitHub Secrets 自動登録

### Phase 3: GitHub Actions 完全自動化
- `staging` branch push → 自動デプロイ
- 監視・アラート自動設定
- ロールバック自動実行

---

## コミット情報

| 項目 | 値 |
|------|-----|
| ブランチ | `feature/enhance-developer-agent` |
| コミット | `10627ce` |
| ファイル | `.github/agents/developer.agent.md`, `.gitignore` |
| バックアップ | `.github/agents/backups/developer.agent.md.backup.20260124_180444` |

---

## 承認者へ

### Code Review チェックリスト

- [ ] Developer の tools フィールド拡張が適切か
- [ ] 権限・責務の明記が明確か
- [ ] セキュリティ注意（シークレット管理）が十分か
- [ ] ワークフロー（5 フェーズ）が実行可能か
- [ ] .gitignore 修正で既存ワークフロー影響なし
- [ ] バックアップ・復旧プロセスが安全か

### マージ後の作業

1. GitHub Actions で自動テスト実行確認
2. Developer による Service Account 自動化実行（Phase 2）
3. 監視・ロールバック手順確認

---

**提案者**: Developer Agent  
**タイプ**: `refactor(agents)`  
**対象**: エージェント定義  
**優先度**: HIGH（後続フェーズの基盤）
