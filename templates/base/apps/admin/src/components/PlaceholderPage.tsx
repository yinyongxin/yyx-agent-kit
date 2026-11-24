import { Paper, Stack, Text, Title } from "@mantine/core";

export const PlaceholderPage = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Stack gap="md">
    <Title order={2}>{title}</Title>
    <Paper withBorder p="lg">
      <Text c="dimmed">{description}</Text>
    </Paper>
  </Stack>
);
