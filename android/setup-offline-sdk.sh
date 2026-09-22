#!/usr/bin/env bash
# uni-app Android 离线打包准备脚本。
# 将 uni-app 构建产物、DCloud AppID/AppKey 与 keystore 签名配置注入
# DCloud 离线 SDK 中的原生工程（HBuilder-Integrate-AS）。
set -euo pipefail

: "${SDK_DIR:?环境变量 SDK_DIR 未设置}"
: "${APPID:?环境变量 APPID 未设置}"
: "${WWW_DIR:?环境变量 WWW_DIR 未设置}"
APPKEY="${APPKEY:-}"

if [ ! -d "$SDK_DIR" ]; then
  echo "::error::离线 SDK 目录不存在: $SDK_DIR"
  exit 1
fi
if [ ! -d "$WWW_DIR" ]; then
  echo "::error::uni-app 资源目录不存在: $WWW_DIR"
  exit 1
fi

MANIFEST="$(find "$SDK_DIR" -path '*/src/main/AndroidManifest.xml' -type f | sort | grep -E '/(app|simpleDemo)/src/main/AndroidManifest\.xml$' | head -n1)"
if [ -z "$MANIFEST" ]; then
  MANIFEST="$(find "$SDK_DIR" -path '*/src/main/AndroidManifest.xml' -type f | sort | head -n1)"
fi
if [ -z "$MANIFEST" ]; then
  echo "::error::未在离线 SDK 中找到 src/main/AndroidManifest.xml"
  exit 1
fi
APP_MODULE="$(dirname "$(dirname "$(dirname "$MANIFEST")")")"
ASSETS_DIR="$APP_MODULE/src/main/assets"
echo "应用模块: $APP_MODULE"

# 1) 写入 dcloud_control.xml（保留 SDK 原有格式，仅替换 appid）
CONTROL_FILE="$ASSETS_DIR/data/dcloud_control.xml"
mkdir -p "$ASSETS_DIR/data"
if [ -f "$CONTROL_FILE" ]; then
  python3 - "$CONTROL_FILE" "$APPID" <<'PY'
import re, sys
path, appid = sys.argv[1], sys.argv[2]
with open(path, encoding='utf-8') as f:
    xml = f.read()
new_xml, count = re.subn(r'appid="[^"]*"', 'appid="%s"' % appid, xml, count=1)
if count == 0:
    new_xml = xml
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_xml)
print("已更新 dcloud_control.xml appid=%s" % appid)
PY
else
  cat > "$CONTROL_FILE" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<dcloud_control>
    <app appid="$APPID" appver="1.0.0"/>
</dcloud_control>
EOF
  echo "已创建 dcloud_control.xml appid=$APPID"
fi

# 2) 拷贝 uni-app 资源到 assets/apps/<appid>/www
rm -rf "${ASSETS_DIR:?}/apps/${APPID:?}"
mkdir -p "$ASSETS_DIR/apps/$APPID/www"
cp -R "$WWW_DIR/." "$ASSETS_DIR/apps/$APPID/www/"
FILE_COUNT="$(find "$ASSETS_DIR/apps/$APPID/www" -type f | wc -l)"
echo "已导入 uni-app 资源，共 $FILE_COUNT 个文件"

# 3) 写入离线打包 AppKey（dcloud_appkey，需与包名、签名 SHA1 绑定）
if [ -n "$APPKEY" ]; then
  python3 - "$MANIFEST" "$APPKEY" <<'PY'
import re, sys
path, appkey = sys.argv[1], sys.argv[2]
with open(path, encoding='utf-8') as f:
    xml = f.read()
pattern = re.compile(r'(android:name="dcloud_appkey"\s+android:value=")[^"]*(")')
if pattern.search(xml):
    xml = pattern.sub(lambda m: m.group(1) + appkey + m.group(2), xml)
else:
    xml = re.sub(
        r'(<application[^>]*>)',
        lambda m: m.group(1) + '\n        <meta-data android:name="dcloud_appkey" android:value="%s" />' % appkey,
        xml, count=1,
    )
with open(path, 'w', encoding='utf-8') as f:
    f.write(xml)
print("已写入 dcloud_appkey")
PY
else
  echo "::warning::未提供 DCLOUD_APPKEY，release 包可能因缺少 AppKey 无法运行"
fi

# 4) 应用 keystore.properties 签名配置
APP_GRADLE="$APP_MODULE/build.gradle"
if [ ! -f "$APP_GRADLE" ]; then
  echo "::error::未找到应用模块 build.gradle: $APP_GRADLE"
  exit 1
fi
if ! grep -q "localbox-signing" "$APP_GRADLE"; then
  printf "\n// localbox-signing\napply from: '%s/signing.gradle'\n" "$SDK_DIR" >> "$APP_GRADLE"
  echo "已注入 signing.gradle: $SDK_DIR/signing.gradle"
fi

echo "离线工程准备完成: $SDK_DIR"
