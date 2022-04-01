NAME = rm-testit-export
VERSION = 1.0.0

testit-export:
	deno run --allow-env --allow-write --allow-read --allow-net --import-map ./import_map.json export.ts
