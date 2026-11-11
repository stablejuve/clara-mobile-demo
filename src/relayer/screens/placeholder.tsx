import type { AppCtx } from "../../ctx";
import { t } from "../../i18n/es";
import { Body, Btn, Card, T, Tag } from "../../ui/primitives";

/** Relleno mientras la pantalla real llega (Tasks 11–15). Se borra en la Task 15. */
export function PlaceholderScreen({ scr, nav }: AppCtx) {
  return (
    <Body gap={12}>
      <Card gap={6}>
        <Tag>{scr}</Tag>
        <T w={400} s={13} lh={1.45}>{t("common.placeholder")}</T>
      </Card>
      <Btn label={t("common.back")} variant="control" onPress={() => nav("benefits")} />
    </Body>
  );
}
