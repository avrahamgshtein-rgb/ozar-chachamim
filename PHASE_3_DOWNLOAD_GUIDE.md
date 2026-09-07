# Phase 3: Download & Organize Google Drive Files

**Status:** Ready for Execution  
**Scope:** Download 75+ research files from Google Drive  
**Timeline:** 2-3 hours (depending on file sizes and network)

---

## 🎯 Objective

Transfer 75+ Google Docs research files from Google Drive folder "חכמי ישראל" to local `sources/` directory, organized by sage.

---

## 📋 Files to Download

### High-Priority Batch (16 files)
These sages have multiple research documents in Drive:

1. **הרב חיים דרוקמן** (ID: 172)
   - Files: 11 research documents
   - Destination: `sources/rabbi-chayim-druckman/`
   - Status: Directory created ✓

2. **רבי אברהם אבולעפיה** (ID: 50)
   - Files: 5 research documents
   - Destination: `sources/rabbi-abraham-abolafia/`
   - Status: Directory created ✓

### Standard Batch (46+ files)
Remaining sages with single or multiple research files:
- Status: Ready to process
- Destination: `sources/{sage-slug}/`

### Additional Files (13 files)
- Miscellaneous research
- Status: To be categorized

**Total: 75+ files**

---

## 🔄 Download Process

### Option 1: Automated Script (Recommended)

Use Python script with Google Drive API:

```bash
cd /path/to/ozar-chachamim
python3 phase3_download_runner.py
```

Script will:
1. Read high-priority sages
2. Search Google Drive for their research files
3. Download files in batches
4. Organize into sources/ folders
5. Create file manifest
6. Update data.json with file references

### Option 2: Manual Download (Step-by-step)

**Step 1: Open Google Drive**
- Go to: https://drive.google.com
- Navigate to: "חכמי ישראל" > "עברית" folder

**Step 2: For each sage**
- Find files related to sage name
- Right-click → Download
- Save to: `sources/{sage-slug}/`

**Step 3: Rename files**
- Rename to: `{sage-name}-research-{date}.docx`
- Example: `rabbi-chayim-druckman-research-2026.docx`

**Step 4: Update manifest**
- Add file path to `phase3_file_manifest.json`

### Option 3: Google Drive Link Sharing (Hybrid)

**Instead of downloading:**
1. Share Google Drive folder link
2. Add folder URL to data.json
3. Users access files directly from Drive
4. Faster setup, no storage needed

---

## 📁 Directory Structure

```
sources/
├── rabbi-chayim-druckman/          [2/2 created]
│   ├── research-files-list.txt
│   └── [files to download]
├── rabbi-abraham-abolafia/         [2/2 created]
│   ├── research-files-list.txt
│   └── [files to download]
├── [44 existing folders]
│   └── [files to organize]
└── [46+ new folders to create]
    └── [files to download]
```

---

## 🔍 File Mapping Reference

### Files by Sage (Known)

| Sage | ID | Files | Drive Folder | Destination |
|------|----|----|---|---|
| הרב חיים דרוקמן | 172 | 11 | עברית > חכמים מודרניים | sources/rabbi-chayim-druckman/ |
| רבי אברהם אבולעפיה | 50 | 5 | עברית > ראשונים | sources/rabbi-abraham-abolafia/ |
| [40+ more] | ... | 59 | (Various folders) | sources/{sage-slug}/ |

---

## 📊 Batch Download Schedule

### Batch 1: High-Priority (16 files)
- **Sages:** 2 (הרב חיים דרוקמן, רבי אברהם אבולעפיה)
- **Files:** 16 documents
- **Est. Time:** 30 minutes
- **Status:** Ready to start

### Batch 2: Standard (46 files)
- **Sages:** 46 sages with 1-2 files each
- **Files:** 46 documents
- **Est. Time:** 1 hour
- **Status:** Manifest ready

### Batch 3: Miscellaneous (13+ files)
- **Category:** Uncategorized/topical files
- **Files:** 13+ documents
- **Est. Time:** 30 minutes
- **Status:** To be categorized

---

## 🛠️ Tools & Scripts

### Automated Download Script
**File:** `phase3_download_runner.py`

Features:
- Batch download with progress tracking
- Automatic folder creation
- File organization
- Manifest generation
- data.json updates

Usage:
```bash
python3 phase3_download_runner.py --mode=batch --count=16
```

### Manual Organization Script
**File:** `phase3_organize_files.py`

Features:
- Organize existing downloads
- Create file lists
- Generate manifest
- Update data.json

Usage:
```bash
python3 phase3_organize_files.py --dry-run
```

---

## 📝 Manifest Format

Files downloaded will be tracked in:
`phase3_file_manifest.json`

Format:
```json
{
  "total_files": 75,
  "downloaded": 16,
  "by_sage": {
    "172": {
      "name": "הרב חיים דרוקמן",
      "files": [
        {
          "filename": "research-1.docx",
          "path": "sources/rabbi-chayim-druckman/research-1.docx",
          "size_mb": 2.3,
          "date_downloaded": "2026-07-17"
        }
      ]
    }
  }
}
```

---

## ✅ Verification Checklist

After downloading each batch:

- [ ] All files downloaded to correct locations
- [ ] File count matches expected
- [ ] Manifest updated
- [ ] data.json references added
- [ ] No broken file paths
- [ ] All files readable/accessible

---

## 🚀 Next Steps (After Download)

### Step 1: Verify Downloads
```bash
python3 -c "
import json
with open('phase3_file_manifest.json') as f:
    m = json.load(f)
    print(f\"Downloaded: {m['downloaded']}/{m['total_files']} files\")
"
```

### Step 2: Update data.json
Each sage node will include:
```json
{
  "id": "172",
  "label": "הרב חיים דרוקמן",
  "has_research": true,
  "research_files": [
    {"name": "research-1.docx", "path": "sources/rabbi-chayim-druckman/research-1.docx"}
  ]
}
```

### Step 3: Deploy
```bash
git add sources/
git commit -m "Phase 3: Add 75+ research files"
git push origin main
```

---

## 💡 Recommended Approach

**For Speed + Safety:**

1. **Start with high-priority batch (30 min)**
   - Download 16 files for 2 key sages
   - Test organization process
   - Verify data.json updates work

2. **Then batch download (1 hour)**
   - Run automated script for remaining files
   - Monitor progress
   - Fix any issues before completing

3. **Finally organize & deploy (30 min)**
   - Verify all files in place
   - Update data.json
   - Run final verification
   - Deploy to production

**Total time: ~2 hours for complete Phase 3**

---

## 📞 Troubleshooting

### Issue: "File not found in Drive"
- Check drive folder name spelling
- Verify you have access to the folder
- Check if file was deleted

### Issue: "Permission denied"
- Ensure config.js has correct API key
- Verify anon key has read access
- Check file sharing settings

### Issue: "Download timeout"
- Files may be large (>50 MB)
- Try smaller batches
- Check network connection

### Issue: "Path already exists"
- File was previously downloaded
- Use --overwrite flag to replace
- Check for duplicate filenames

---

## 📋 Files Generated/Used

### Input Files
- `data.json` - Sage database
- `phase2b_manifest.json` - Organization plan
- `phase3_download_plan.json` - Download strategy

### Output Files (to be created)
- `sources/` folder structure - Organized files
- `phase3_file_manifest.json` - Download tracking
- `phase3_completion_report.md` - Summary

### Scripts
- `phase3_download_runner.py` - Automated download
- `phase3_organize_files.py` - Organization helper
- `phase3_verify_downloads.py` - Verification script

---

## ⏱️ Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 3A | High-priority download (16 files) | 30 min | 🟡 Ready |
| 3B | Batch download (46 files) | 1 hour | 🔄 Queued |
| 3C | Organize & verify all files | 30 min | 🔄 Queued |
| 3D | Update data.json & deploy | 30 min | 🔄 Queued |
| **Total** | **Complete Phase 3** | **~2.5 hrs** | 🟡 In progress |

---

## 🎯 Success Criteria

✅ Phase 3 will be complete when:

1. All 75+ files downloaded from Google Drive
2. Files organized in sources/{sage-slug}/ folders
3. File manifest created and accurate
4. data.json updated with file references
5. All verification tests pass
6. Project ready for production deployment

---

## 🔗 Reference Links

- [Google Drive API Docs](https://developers.google.com/drive/api)
- [File Organization Standard](../CLAUDE.md#file-handling-rules)
- [data.json Schema](../data.json) (reference)
- [Phase 2 Report](./PHASE_2_COMPLETION_REPORT.md)

---

**Ready to download?** 🚀

Start with: `python3 phase3_download_runner.py`

Or choose manual option if preferred.

---

*Guide created: 2026-07-17 15:50 UTC*
