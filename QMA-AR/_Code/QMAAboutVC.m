
#import "QMAAboutVC.h"


@interface QMAAboutVC ()

@end


@implementation QMAAboutVC

- (void)viewDidLoad {
    [super viewDidLoad];
}

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

@end
