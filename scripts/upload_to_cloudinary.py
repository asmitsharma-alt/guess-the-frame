import os
import re
import json
import cloudinary
import cloudinary.uploader

# Cloudinary configuration
cloudinary.config(
    cloud_name="xxvk1ruz",
    api_key="458495938969444",
    api_secret="lY1VKtSpHIEdB-8j9zbk9WcVAls"
)

SOURCE_DIR = r"C:\Users\admin\Pictures\main guess the frame\GUESSTHEFRAME"
PROJECT_ROOT = r"C:\Users\admin\Pictures\main guess the frame"
CLOUDINARY_FOLDER = "GUESSTHEFRAME"

def parse_movie_info(filename):
    name_no_ext = os.path.splitext(filename)[0]
    match = re.search(r"^(.*?)(?:\s*\((\d{4})\))?$", name_no_ext)
    if match:
        title = match.group(1).strip()
        year = match.group(2) if match.group(2) else ""
        return title, year
    return name_no_ext, ""

def main():
    files = [f for f in sorted(os.listdir(SOURCE_DIR)) if f.lower().endswith(".webp")]
    print(f"Found {len(files)} WebP images in {SOURCE_DIR}\n")
    
    results = []
    
    for idx, filename in enumerate(files, 1):
        file_path = os.path.join(SOURCE_DIR, filename)
        base_name = os.path.splitext(filename)[0]
        title, year = parse_movie_info(filename)
        
        print(f"[{idx}/{len(files)}] Uploading: {filename} ...")
        
        try:
            upload_result = cloudinary.uploader.upload(
                file_path,
                folder=CLOUDINARY_FOLDER,
                public_id=base_name,
                use_filename=True,
                unique_filename=False,
                overwrite=True,
                resource_type="image"
            )
            
            item = {
                "index": idx,
                "title": title,
                "year": year,
                "filename": filename,
                "public_id": upload_result.get("public_id"),
                "secure_url": upload_result.get("secure_url"),
                "url": upload_result.get("url"),
                "format": upload_result.get("format"),
                "width": upload_result.get("width"),
                "height": upload_result.get("height"),
                "bytes": upload_result.get("bytes")
            }
            results.append(item)
            print(f"   -> Success: {upload_result.get('secure_url')} ({upload_result.get('bytes') / 1024:.1f} KB)")
        except Exception as e:
            print(f"   -> ERROR uploading {filename}: {e}")
            
    print(f"\nUploaded {len(results)}/{len(files)} images to Cloudinary successfully.")
    
    # Generate JSON link file
    json_data = {
        "folder": CLOUDINARY_FOLDER,
        "total": len(results),
        "images": results
    }
    
    # Generate Markdown link file
    md_lines = [
        "# Cloudinary Image Links - Guess The Frame (WebP)",
        "",
        f"Total images: **{len(results)}**  ",
        f"Cloudinary Folder: `{CLOUDINARY_FOLDER}`  ",
        f"Cloud Name: `xxvk1ruz`  ",
        "",
        "| # | Movie Title | Year | Dimensions | Size | Cloudinary Secure URL | Preview |",
        "|---|---|---|---|---|---|---|"
    ]
    for item in results:
        size_kb = f"{item['bytes'] / 1024:.1f} KB"
        dim = f"{item['width']}x{item['height']}"
        md_lines.append(
            f"| {item['index']} | **{item['title']}** | {item['year']} | {dim} | {size_kb} | [{item['filename']}]({item['secure_url']}) | <img src=\"{item['secure_url']}\" width=\"100\" /> |"
        )
        
    md_lines.append("")
    md_lines.append("## Raw URL List")
    md_lines.append("```text")
    for item in results:
        md_lines.append(item["secure_url"])
    md_lines.append("```")
    md_lines.append("")
    
    # Plain text links file
    txt_lines = [f"{item['filename']}: {item['secure_url']}" for item in results]
    
    # Save files to both GUESSTHEFRAME directory and project root
    output_locations = [SOURCE_DIR, PROJECT_ROOT]
    for out_dir in output_locations:
        json_path = os.path.join(out_dir, "cloudinary_links.json")
        md_path = os.path.join(out_dir, "cloudinary_links.md")
        txt_path = os.path.join(out_dir, "cloudinary_links.txt")
        
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=2)
            
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))
            
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(txt_lines))
            
        print(f"Wrote links to: {json_path}")
        print(f"Wrote links to: {md_path}")
        print(f"Wrote links to: {txt_path}")

if __name__ == "__main__":
    main()
