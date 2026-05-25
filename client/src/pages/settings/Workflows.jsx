import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { WorkflowBuilder } from '../../components/dashboard/WorkflowBuilder';
import { api } from '../../services/platform.service';

export const Workflows = () => {
  const { data = [] } = useQuery({ queryKey: ['workflows'], queryFn: api.workflows });
  return (
    <>
      <PageHeader title="Workflow Builder" description="Drag workflow nodes and model IF/THEN approval logic for expense routing." />
      <WorkflowBuilder workflow={data[0]} />
    </>
  );
};
