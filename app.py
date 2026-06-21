import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_EXPIRY = 600  # Cache for 10 minutes (600 seconds)

cache = {
    "data": None,
    "last_updated": 0
}

def parse_xml_feed(xml_content):
    root = ET.fromstring(xml_content)
    # Atom namespace
    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"
        
    entries = root.findall(f"{ns}entry")
    parsed_entries = []
    
    for entry in entries:
        title = entry.find(f"{ns}title").text
        updated = entry.find(f"{ns}updated").text
        content_el = entry.find(f"{ns}content")
        content_html = content_el.text if content_el is not None else ""
        link_el = entry.find(f"{ns}link")
        link = link_el.attrib.get('href', '') if link_el is not None else ''
        
        soup = BeautifulSoup(content_html, 'html.parser')
        sections = []
        current_section = None
        
        for child in soup.contents:
            if child.name in ['h3', 'h4']:
                if current_section:
                    sections.append(current_section)
                current_section = {
                    "type": child.get_text().strip(),
                    "content_elements": []
                }
            elif current_section:
                if child.name is not None or (isinstance(child, str) and child.strip()):
                    current_section["content_elements"].append(str(child))
            else:
                if child.name is not None or (isinstance(child, str) and child.strip()):
                    current_section = {
                        "type": "General",
                        "content_elements": [str(child)]
                    }
                    
        if current_section:
            sections.append(current_section)
            
        formatted_sections = []
        for sec in sections:
            sec_html = "".join(sec["content_elements"]).strip()
            sec_soup = BeautifulSoup(sec_html, 'html.parser')
            sec_text = sec_soup.get_text().strip()
            sec_text = " ".join(sec_text.split()) # clean up extra spaces/newlines
            
            # Map type to a standard category icon class
            sec_type = sec["type"]
            formatted_sections.append({
                "type": sec_type,
                "html": sec_html,
                "text": sec_text
            })
            
        parsed_entries.append({
            "date": title,
            "updated": updated,
            "link": link,
            "sections": formatted_sections
        })
        
    return parsed_entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_updated"]) > CACHE_EXPIRY:
        try:
            response = requests.get(FEED_URL, timeout=15)
            if response.status_code == 200:
                parsed_data = parse_xml_feed(response.content)
                cache["data"] = parsed_data
                cache["last_updated"] = now
            else:
                return jsonify({
                    "error": f"Failed to fetch feed, status code {response.status_code}",
                    "using_cached": cache["data"] is not None,
                    "data": cache["data"]
                }), 502
        except Exception as e:
            return jsonify({
                "error": f"An error occurred while fetching: {str(e)}",
                "using_cached": cache["data"] is not None,
                "data": cache["data"]
            }), 500
            
    return jsonify({
        "data": cache["data"],
        "last_updated": cache["last_updated"]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
