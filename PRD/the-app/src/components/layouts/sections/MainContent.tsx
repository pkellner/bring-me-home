import PersonImage from './PersonImage';
import Story from './Story';
import { SerializedPerson } from '../LayoutRenderer';

interface MainContentProps {
  person: SerializedPerson;
}

export default function MainContent({ person }: MainContentProps) {
  return (
    <div className="main-content space-y-6">
      <PersonImage person={person} />
      <Story person={person} />
    </div>
  );
}