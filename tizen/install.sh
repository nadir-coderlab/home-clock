#!/bin/zsh
# يثبّت ساعة البيت على شاشة سامسونج في نفس الشبكة.
# قبلها في الشاشة: Apps ← اكتب 12345 ← Developer mode: On ← Host PC IP = عنوان الماك ← أعد تشغيل الشاشة.
#   ./install.sh <عنوان الشاشة>   (لو ما أعطيته يدوّر عليه)
set -e
cd ${0:A:h}
SDB=~/tizen-studio/tools/sdb; T=~/tizen-studio/tools/ide/bin/tizen
IP=$1
if [[ -z $IP ]]; then
  NET=$(ipconfig getifaddr en0 | cut -d. -f1-3)
  IP=$(for i in {2..254}; do (nc -z -G 1 $NET.$i 26101 2>/dev/null && echo $NET.$i) & done; wait)
  IP=${IP%%$'\n'*}
fi
[[ -z $IP ]] && { echo "• ما لقيت الشاشة. تأكد إن وضع المطوّر شغّال وإن عنوان الماك صحيح"; exit 1; }
$SDB connect $IP:26101
DEV=$($SDB devices | awk 'NR>1 && $2=="device"{print $3; exit}')
echo "• الجهاز: $DEV"
[[ -f HomeClock.wgt ]] || ./build.sh
$T install -n HomeClock.wgt -t $DEV
$T run -p HmClock001.HomeClock -t $DEV
echo "• ثبّتت ساعة البيت وشغّلتها"
