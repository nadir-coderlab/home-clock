#!/bin/zsh
# يبني ملف التطبيق ساعة-البيت.wgt لشاشة سامسونج: الغلاف + نسخة من التصميم (احتياط لو انقطع النت)
#   ./build.sh [اسم ملف التوقيع، الافتراضي homeclock]
set -e
cd ${0:A:h}
PROFILE=${1:-homeclock}
T=~/tizen-studio/tools/ide/bin/tizen
rm -rf build && mkdir build
cp config.xml index.html icon.png build/
mkdir -p build/web && cp -R ../web/{index.html,style.css,app.js,holidays.json,fonts,vendor} build/web/
[[ -d ../web/photos ]] && cp -R ../web/photos build/web/
$T package -t wgt -s $PROFILE -- build >/dev/null
mv build/*.wgt ./HomeClock.wgt
echo "• HomeClock.wgt ($(du -h HomeClock.wgt | cut -f1))"
