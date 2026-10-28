import { useId, useMemo } from 'react';

import type { SVGProps } from 'react';

import { iconsData } from './icons-data';

export interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  'ref' | 'children' | 'dangerouslySetInnerHTML'
> {
  /** 形如 "prefix:name"，数据来自离线的 icons-data.ts */
  icon: string;
}

const unitsSplit = /(-?[0-9.]*[0-9]+[0-9.]*)/g;
const unitsTest = /^-?[0-9.]*[0-9]+[0-9.]*$/;

// 同 iconify 的 calculateSize：按宽高比换算另一边的尺寸，保留单位
function calculateSize(size: string | number, ratio: number): string {
  if (typeof size === 'number') return String(Math.ceil(size * ratio * 100) / 100);
  const oldParts = size.split(unitsSplit);
  const newParts: string[] = [];
  let code = oldParts.shift() as string;
  let isNumber = unitsTest.test(code);
  while (true) {
    if (isNumber) {
      const num = parseFloat(code);
      newParts.push(isNaN(num) ? code : String(Math.ceil(num * ratio * 100) / 100));
    } else {
      newParts.push(code);
    }
    code = oldParts.shift() as string;
    if (code === undefined) return newParts.join('');
    isNumber = !isNumber;
  }
}

const idRegex = /\sid="(\S+)"/g;

function replaceIDs(body: string, prefix: string): string {
  const ids = [...body.matchAll(idRegex)].map((m) => m[1]);
  if (!ids.length) return body;
  return ids.reduce(
    (acc, id) =>
      acc
        .replaceAll(`id="${id}"`, `id="${prefix}${id}"`)
        .replaceAll(`url(#${id})`, `url(#${prefix}${id})`)
        .replaceAll(`href="#${id}"`, `href="#${prefix}${id}"`),
    body,
  );
}

export function Icon({ icon, className, width, height, style, color, ...rest }: IconProps) {
  const uid = useId().replace(/:/g, '');
  const data = iconsData[icon];
  const body = useMemo(() => (data ? replaceIDs(data.body, `icon${uid}_`) : ''), [data, uid]);
  const [prefix = ''] = icon.split(':');
  const classes = ['iconify', prefix && `iconify--${prefix}`, className].filter(Boolean).join(' ');

  const boxWidth = data?.width ?? 16;
  const boxHeight = data?.height ?? 16;
  let w: string | number;
  let h: string | number;
  if (width === undefined) {
    h = height === undefined ? '1em' : height;
    w = calculateSize(h, boxWidth / boxHeight);
  } else {
    w = width;
    h = height === undefined ? calculateSize(w, boxHeight / boxWidth) : height;
  }

  return (
    <svg
      aria-hidden="true"
      role="img"
      {...rest}
      className={classes}
      style={color ? { color, ...style } : style}
      width={w}
      height={h}
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
